import { useCallback, useEffect, useRef, useState } from 'react'
import { keepAwake, mic, tone } from '../audio/engine'
import { goertzel } from '../audio/goertzel'
import { findResonance, trackResonance, type Measure, type SweepPoint, type TunerProgress } from '../audio/tuner'

export type PlayMode = 'off' | 'playing' | 'tuning' | 'tracking'

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

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

export function usePlayer(freq: number | null, onLocked: (f: number) => void) {
  const [mode, setMode] = useState<PlayMode>('off')
  const [volume, setVolumeState] = useState(0.5)
  const [secondsLeft, setSecondsLeft] = useState(MAX_PLAY_S)
  const [autoStopped, setAutoStopped] = useState(false)
  const [progress, setProgress] = useState<TunerProgress | null>(null)
  const [coarsePoints, setCoarsePoints] = useState<SweepPoint[]>([])
  const [gainDb, setGainDb] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)
  const onLockedRef = useRef(onLocked)
  onLockedRef.current = onLocked

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    tone.stop()
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
    setProgress(null)
    setCoarsePoints([])
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await mic.start()
      await tone.start(freq, volume)
      setMode('tuning')
      startClock()
      let coarse: SweepPoint[] = []
      const locked = await findResonance(micMeasure, freq, ctrl.signal, (p) => {
        if (p.stage === 'coarse') coarse = p.points
        setCoarsePoints(coarse)
        setProgress({ ...p, points: [...p.points] })
      })
      const bestAmp = Math.max(...coarse.map((p) => p.amp))
      const base = median(coarse.map((p) => p.amp))
      setGainDb(base > 0 ? 20 * Math.log10(bestAmp / base) : 0)
      onLockedRef.current(locked)
      setMode('tracking')
      await trackResonance(micMeasure, locked, ctrl.signal, (f) => onLockedRef.current(f))
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
    coarsePoints,
    gainDb,
    error,
    play,
    tune,
    stop,
  }
}
