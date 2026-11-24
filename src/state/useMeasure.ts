import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mic } from '../audio/engine'
import { spectrum, type Spectrum } from '../audio/fft'
import { findPeaks, type PeakOptions } from '../audio/peaks'
import { TapDetector } from '../audio/tapDetector'
import type { Key } from '../i18n'
import { toAppError } from './micError'

export type MeasureStatus =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'error'; key: Key; msg?: string }

const LISTEN_TIMEOUT_MS = 15000

function waitForTap(signal: AbortSignal): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const det = new TapDetector({ sampleRate: mic.sampleRate })
    const timer = setTimeout(() => finish(() => reject(new Error('timeout'))), LISTEN_TIMEOUT_MS)
    const unsub = mic.subscribe((chunk) => {
      const out = det.push(chunk)
      if (out) finish(() => resolve(out))
    })
    const onAbort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')))
    signal.addEventListener('abort', onAbort)
    function finish(fn: () => void) {
      clearTimeout(timer)
      unsub()
      signal.removeEventListener('abort', onAbort)
      fn()
    }
  })
}

export function useMeasure(peakOptions: PeakOptions) {
  const [status, setStatus] = useState<MeasureStatus>({ kind: 'idle' })
  const [spec, setSpec] = useState<Spectrum | null>(null)
  const [taps, setTaps] = useState<number[]>([])
  const [freq, setFreq] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(peakOptions)
  useEffect(() => {
    optionsRef.current = peakOptions
  }, [peakOptions])

  // Re-evaluated whenever the user changes the detection settings — no need to tap again.
  const peaks = useMemo(() => (spec ? findPeaks(spec, peakOptions) : []), [spec, peakOptions])

  const listen = useCallback(
    async (addToAverage = false) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStatus({ kind: 'listening' })
      try {
        await mic.start()
        if (ctrl.signal.aborted) return
        const samples = await waitForTap(ctrl.signal)
        const s = spectrum(samples, mic.sampleRate)
        const found = findPeaks(s, optionsRef.current)
        // Show the spectrum even without a clear peak — the user can relax the detection settings.
        setSpec(s)
        if (found.length === 0) {
          setStatus({ kind: 'error', key: 'noPeak' })
          return
        }

        let nextTaps: number[]
        if (addToAverage && freq !== null) {
          const near = found
            .filter((p) => Math.abs(p.freq - freq) / freq < 0.03)
            .sort((a, b) => Math.abs(a.freq - freq) - Math.abs(b.freq - freq))[0]
          nextTaps = near ? [...taps, near.freq] : [found[0].freq]
        } else {
          nextTaps = [found[0].freq]
        }
        setTaps(nextTaps)
        setFreq(nextTaps.reduce((a, b) => a + b, 0) / nextTaps.length)
        setStatus({ kind: 'idle' })
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') {
          setStatus({ kind: 'idle' })
        } else if ((e as Error)?.message === 'timeout') {
          setStatus({ kind: 'error', key: 'noTap' })
        } else {
          setStatus({ kind: 'error', ...toAppError(e) })
        }
      } finally {
        // Release the microphone as soon as the sample is taken (unless a newer listen took over).
        if (abortRef.current === ctrl || abortRef.current === null) {
          abortRef.current = null
          mic.stop()
        }
      }
    },
    [freq, taps],
  )

  /** Works at any stage, even while still waiting for the mic permission / audio start. */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    mic.stop()
    setStatus({ kind: 'idle' })
  }, [])

  // Going to the background releases the mic (engine.ts); stop waiting for a tap that can't come.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && abortRef.current && cancel()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [cancel])

  /** Choose a different spectral peak (resets averaging). */
  const pick = useCallback((f: number) => {
    setTaps([f])
    setFreq(f)
  }, [])

  /** Set the frequency directly (manual adjust, history, tuner lock). */
  const setFrequency = useCallback((f: number) => setFreq(f), [])

  return { status, spec, peaks, taps, freq, listen, cancel, pick, setFrequency }
}
