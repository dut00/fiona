import { rms, toDb } from './goertzel'
const workletUrl = `${import.meta.env.BASE_URL}capture-worklet.js`

type ChunkListener = (chunk: Float32Array) => void

let ctx: AudioContext | null = null

/** How long to wait for a suspended/interrupted context to come back before rebuilding it. */
const RESUME_TIMEOUT_MS = 1000
/** How long a freshly opened microphone may stay silent before the audio pipeline is rebuilt. */
const FIRST_DATA_TIMEOUT_MS = 1500

/** Resolves to `fallback` if `p` does not settle within `ms` (and swallows its rejection). */
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      () => (clearTimeout(t), resolve(fallback)),
    )
  })
}

/**
 * Shared AudioContext. Must first be called from a user gesture (iOS).
 *
 * After the app has been in the background the OS may leave the context "suspended" or
 * "interrupted" (iOS), and resume() can hang forever. So resume() gets a deadline; a context that
 * does not come back is thrown away and a fresh one is created.
 */
export async function getContext(): Promise<AudioContext> {
  if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
    await within(ctx.resume(), RESUME_TIMEOUT_MS, undefined)
    // (state may have changed during the await — TS cannot know that)
    if ((ctx.state as AudioContextState) !== 'running') await dropContext()
  }
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext({ latencyHint: 'interactive' })
  if (ctx.state !== 'running') await within(ctx.resume(), RESUME_TIMEOUT_MS, undefined)
  return ctx
}

/**
 * Drops the current AudioContext; the next getContext() builds a new one. Only called when the
 * microphone holds no nodes in it (before opening, or after Microphone.release()).
 */
async function dropContext() {
  tone.reset()
  const old = ctx
  ctx = null
  if (old && old.state !== 'closed') await within(old.close(), RESUME_TIMEOUT_MS, undefined)
}

export class MicrophoneError extends Error {
  constructor(public readonly kind: 'denied' | 'unsupported' | 'silent' | 'other', message: string) {
    super(message)
  }
}

/**
 * Microphone input with raw processing disabled (no echo cancellation, noise suppression or AGC
 * — those would distort both the tap spectrum and the resonance measurement).
 */
class Microphone {
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private sink: GainNode | null = null
  private starting: Promise<void> | null = null
  /** Context the capture worklet module has been loaded into (it is per context). */
  private moduleCtx: AudioContext | null = null
  /** Bumped by stop(): an open() that was started before is stale and must not take over. */
  private generation = 0
  private gotData = false
  private onFirstData: (() => void) | null = null
  private listeners = new Set<ChunkListener>()
  private levelBuf: Float32Array<ArrayBuffer> | null = null
  sampleRate = 48000

  get active() {
    return this.stream !== null
  }

  /** Opens the microphone (idempotent; concurrent calls share one request). */
  start(): Promise<void> {
    if (this.stream) return Promise.resolve()
    if (this.starting) return this.starting
    const p = this.openChecked().finally(() => {
      if (this.starting === p) this.starting = null
    })
    this.starting = p
    return p
  }

  /**
   * Opens the mic and makes sure samples actually arrive. A context that survived a trip to the
   * background can look healthy while delivering nothing — then the whole pipeline is rebuilt once.
   */
  private async openChecked(): Promise<void> {
    await this.open()
    if (await this.waitForData(FIRST_DATA_TIMEOUT_MS)) return
    this.release()
    await dropContext()
    await this.open()
    if (await this.waitForData(FIRST_DATA_TIMEOUT_MS)) return
    this.release()
    throw new MicrophoneError('silent', 'The microphone delivers no audio')
  }

  private waitForData(ms: number): Promise<boolean> {
    if (this.gotData) return Promise.resolve(true)
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        this.onFirstData = null
        resolve(false)
      }, ms)
      this.onFirstData = () => {
        clearTimeout(t)
        this.onFirstData = null
        resolve(true)
      }
    })
  }

  private async open(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneError('unsupported', 'getUserMedia not available (HTTPS required)')
    }
    const gen = this.generation
    const aborted = () => new DOMException('Aborted', 'AbortError')
    const ac = await getContext()
    if (gen !== this.generation) throw aborted()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      })
    } catch (e) {
      const name = (e as DOMException)?.name
      throw new MicrophoneError(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'other',
        String(e),
      )
    }
    // Cancelled (stop(), app hidden) while waiting for the permission prompt → release and bail.
    if (gen !== this.generation) {
      stream.getTracks().forEach((t) => t.stop())
      throw aborted()
    }
    try {
      if (this.moduleCtx !== ac) {
        await ac.audioWorklet.addModule(workletUrl)
        this.moduleCtx = ac
      }
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop())
      throw e
    }
    if (gen !== this.generation) {
      stream.getTracks().forEach((t) => t.stop())
      throw aborted()
    }
    const src = ac.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ac, 'fiona-capture', { numberOfInputs: 1, numberOfOutputs: 1 })
    this.gotData = false
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (!this.gotData) {
        this.gotData = true
        this.onFirstData?.()
      }
      for (const l of this.listeners) l(e.data)
    }
    // Keep the worklet in the rendering graph via a silent sink.
    const sink = ac.createGain()
    sink.gain.value = 0
    src.connect(node).connect(sink).connect(ac.destination)

    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)

    // The OS can take the mic away (background, phone call…): forget it so the next start reopens.
    for (const track of stream.getAudioTracks()) {
      track.addEventListener('ended', () => {
        if (this.stream === stream) this.stop()
      })
    }

    this.stream = stream
    this.source = src
    this.sink = sink
    this.node = node
    this.analyser = analyser
    this.levelBuf = new Float32Array(analyser.fftSize)
    this.sampleRate = ac.sampleRate
  }

  /** Releases the microphone so the browser's "recording" indicator goes away. */
  stop() {
    this.generation++ // a start() still in progress must not take over afterwards
    this.starting = null
    this.release()
  }

  private release() {
    this.gotData = false
    this.stream?.getTracks().forEach((t) => t.stop())
    this.source?.disconnect()
    this.node?.disconnect()
    this.sink?.disconnect()
    this.analyser?.disconnect()
    if (this.node) this.node.port.onmessage = null
    this.stream = null
    this.source = null
    this.sink = null
    this.node = null
    this.analyser = null
  }

  subscribe(l: ChunkListener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  /** Current input level in dBFS (RMS over the last ~43 ms). */
  levelDb(): number {
    if (!this.analyser || !this.levelBuf) return -120
    this.analyser.getFloatTimeDomainData(this.levelBuf)
    return toDb(rms(this.levelBuf))
  }

  /** Collect `ms` of audio starting now. */
  record(ms: number, signal?: AbortSignal): Promise<Float32Array> {
    const total = Math.round((ms / 1000) * this.sampleRate)
    const out = new Float32Array(total)
    let len = 0
    return new Promise((resolve, reject) => {
      // Samples stopped arriving (mic taken away mid-run) → fail instead of hanging.
      const watchdog = setTimeout(() => {
        unsub()
        reject(new MicrophoneError('silent', 'The microphone stopped delivering audio'))
      }, ms + FIRST_DATA_TIMEOUT_MS)
      const unsub = this.subscribe((chunk) => {
        const n = Math.min(chunk.length, total - len)
        out.set(chunk.subarray(0, n), len)
        len += n
        if (len >= total) {
          clearTimeout(watchdog)
          unsub()
          resolve(out)
        }
      })
      signal?.addEventListener('abort', () => {
        clearTimeout(watchdog)
        unsub()
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
  }
}

export const mic = new Microphone()

/** Sine tone generator with click-free ramps. */
class Tone {
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private _volume = 0.5
  frequency = 440

  get playing() {
    return this.osc !== null
  }

  async start(freq: number, volume = this._volume) {
    const ac = await getContext()
    this.stopNow()
    this.frequency = freq
    this._volume = volume
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0, ac.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.2)
    osc.connect(gain).connect(ac.destination)
    osc.start()
    this.osc = osc
    this.gain = gain
  }

  setFrequency(freq: number) {
    this.frequency = freq
    if (this.osc && ctx) this.osc.frequency.setValueAtTime(freq, ctx.currentTime)
  }

  setVolume(volume: number) {
    this._volume = volume
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05)
  }

  stop() {
    if (!this.osc || !this.gain || !ctx) return
    const { osc, gain } = this
    const t = ctx.currentTime
    gain.gain.cancelScheduledValues(t)
    gain.gain.setValueAtTime(gain.gain.value, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.1)
    osc.stop(t + 0.12)
    osc.onended = () => gain.disconnect()
    this.osc = null
    this.gain = null
  }

  /** Forget nodes of a discarded AudioContext. */
  reset() {
    this.stopNow()
  }

  private stopNow() {
    try {
      this.osc?.stop()
    } catch {
      /* already stopped */
    }
    this.gain?.disconnect()
    this.osc = null
    this.gain = null
  }
}

export const tone = new Tone()

// In the background: release the mic and let the context sleep. The next tap on a button starts
// from a clean state (getContext() resumes or rebuilds the context).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    mic.stop()
    tone.reset()
    if (ctx?.state === 'running') ctx.suspend().catch(() => {})
  })
}

/** Keeps the screen on while sound is playing. Silently ignored where unsupported. */
let wakeLock: WakeLockSentinel | null = null
export async function keepAwake(on: boolean) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => (wakeLock = null))
    } else if (!on && wakeLock) {
      await wakeLock.release()
      wakeLock = null
    }
  } catch {
    /* not critical */
  }
}
