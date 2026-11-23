import { useCallback, useEffect, useRef, useState } from 'react'
import { keepAwake, mic, tone } from '../audio/engine'
import { goertzel } from '../audio/goertzel'
import { findResonance, type Measure, type SweepPoint, type TunerProgress } from '../audio/tuner'

export type PlayMode = 'off' | 'playing' | 'tuning'

/** Hearing protection: continuous playback is limited to this many seconds. */
export const MAX_PLAY_S = 60
export const LOUD_VOLUME = 0.75

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })

/** Drive at `freq`, let the object build up, then measure its answer with the microphone. */
const micMeasure: Measure = async (freq, dwellMs, signal) => {
  tone.setFrequency(freq)
  const windowMs = Math.min(200, dwellMs / 2)
  await sleep(dwellMs - windowMs, signal)
  const samples = await mic.record(windowMs, signal)
  return goertzel(samples, freq, mic.sampleRate)
}

export function usePlayer(freq: number | null, onLocked: (f: number) => void) {
  const [mode, setMode] = useState<PlayMode>('off')
  const [volume, setVolumeState] = useState(0.5)
  const [secondsLeft, setSecondsLeft] = useState(MAX_PLAY_S)
  const [autoStopped, setAutoStopped] = useState(false)
  const [progress, setProgress] = useState<TunerProgress | null>(null)
  /** Measurements of the last finished tuning run */
  const [points, setPoints] = useState<SweepPoint[]>([])
  const [gainDb, setGainDb] = useState<number | null>(null)
  const [tunedFreq, setTunedFreq] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)
  const onLockedRef = useRef(onLocked)
  onLockedRef.current = onLocked

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    tone.stop()
    mic.stop() // only the tuner uses it; release it whenever playback ends
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = null
    keepAwake(false)
    setMode('off')
  }, [])

  const startClock = useCallback(() => {
    setAutoStopped(false)
    setSecondsLeft(MAX_PLAY_S)
    keepAwake(true)
    const started = Date.now()
    if (timerRef.current !== null) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      const left = MAX_PLAY_S - Math.floor((Date.now() - started) / 1000)
      setSecondsLeft(left)
      if (left <= 0) {
        stop()
        setAutoStopped(true)
      }
    }, 250)
  }, [stop])

  const play = useCallback(async () => {
    if (freq === null) return
    stop()
    setError(null)
    await tone.start(freq, volume)
    setMode('playing')
    startClock()
  }, [freq, volume, stop, startClock])

  const tune = useCallback(async () => {
    if (freq === null) return
    stop()
    setError(null)
    setGainDb(null)
    setTunedFreq(null)
    setProgress(null)
    setPoints([])
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await mic.start()
      await tone.start(freq, volume)
      setMode('tuning')
      startClock()
      const result = await findResonance(micMeasure, freq, ctrl.signal, setProgress)
      // Done: release the mic and keep driving the object at the found frequency.
      mic.stop()
      tone.setFrequency(result.freq)
      setPoints(result.points)
      setGainDb(result.gainDb)
      setTunedFreq(result.freq)
      onLockedRef.current(result.freq)
      setProgress(null)
      setMode('playing')
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') {
        setError(String(e))
        stop()
      }
    }
  }, [freq, volume, stop, startClock])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    tone.setVolume(v)
  }, [])

  // Manual frequency changes while plainly playing follow immediately.
  useEffect(() => {
    if (mode === 'playing' && freq !== null) tone.setFrequency(freq)
  }, [freq, mode])

  // Safety: stop when the app goes to the background or unmounts.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && stop()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      stop()
    }
  }, [stop])

  return {
    mode,
    volume,
    setVolume,
    secondsLeft,
    autoStopped,
    progress,
    points,
    gainDb,
    tunedFreq,
    error,
    play,
    tune,
    stop,
  }
}
