import { rms, toDb } from './goertzel'
const workletUrl = `${import.meta.env.BASE_URL}capture-worklet.js`

type ChunkListener = (chunk: Float32Array) => void

let ctx: AudioContext | null = null

/** Shared AudioContext. Must first be called from a user gesture (iOS). */
export async function getContext(): Promise<AudioContext> {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' })
  }
  if (ctx.state !== 'running') await ctx.resume()
  return ctx
}

export class MicrophoneError extends Error {
  constructor(public readonly kind: 'denied' | 'unsupported' | 'other', message: string) {
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
  private listeners = new Set<ChunkListener>()
  private levelBuf: Float32Array<ArrayBuffer> | null = null
  sampleRate = 48000

  get active() {
    return this.stream !== null
  }

  async start(): Promise<void> {
    if (this.stream) return
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new MicrophoneError('unsupported', 'getUserMedia not available (HTTPS required)')
    }
    const ac = await getContext()
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
    await ac.audioWorklet.addModule(workletUrl)
    const src = ac.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ac, 'fiona-capture', { numberOfInputs: 1, numberOfOutputs: 1 })
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      for (const l of this.listeners) l(e.data)
    }
    // Keep the worklet in the rendering graph via a silent sink.
    const sink = ac.createGain()
    sink.gain.value = 0
    src.connect(node).connect(sink).connect(ac.destination)

    const analyser = ac.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)

    this.stream = stream
    this.node = node
    this.analyser = analyser
    this.levelBuf = new Float32Array(analyser.fftSize)
    this.sampleRate = ac.sampleRate
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.node?.disconnect()
    this.analyser?.disconnect()
    this.stream = null
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
      const unsub = this.subscribe((chunk) => {
        const n = Math.min(chunk.length, total - len)
        out.set(chunk.subarray(0, n), len)
        len += n
        if (len >= total) {
          unsub()
          resolve(out)
        }
      })
      signal?.addEventListener('abort', () => {
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
