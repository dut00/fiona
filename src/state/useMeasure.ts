import { useCallback, useRef, useState } from 'react'
import { mic, MicrophoneError } from '../audio/engine'
import { spectrum, type Spectrum } from '../audio/fft'
import { findPeaks, type Peak } from '../audio/peaks'
import { TapDetector } from '../audio/tapDetector'
import type { Key } from '../i18n'

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

export function useMeasure() {
  const [status, setStatus] = useState<MeasureStatus>({ kind: 'idle' })
  const [spec, setSpec] = useState<Spectrum | null>(null)
  const [peaks, setPeaks] = useState<Peak[]>([])
  const [taps, setTaps] = useState<number[]>([])
  const [freq, setFreq] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const listen = useCallback(
    async (addToAverage = false) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setStatus({ kind: 'listening' })
      try {
        await mic.start()
        const samples = await waitForTap(ctrl.signal)
        const s = spectrum(samples, mic.sampleRate)
        const found = findPeaks(s, { fMin: 150, fMax: 8000 })
        if (found.length === 0) {
          setStatus({ kind: 'error', key: 'noPeak' })
          return
        }
        setSpec(s)
        setPeaks(found)

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
        } else if (e instanceof MicrophoneError) {
          setStatus({
            kind: 'error',
            key: e.kind === 'denied' ? 'micDenied' : e.kind === 'unsupported' ? 'micUnsupported' : 'micError',
            msg: e.message,
          })
        } else if ((e as Error)?.message === 'timeout') {
          setStatus({ kind: 'error', key: 'noTap' })
        } else {
          setStatus({ kind: 'error', key: 'micError', msg: String(e) })
        }
      }
    },
    [freq, taps],
  )

  const cancel = useCallback(() => abortRef.current?.abort(), [])

  /** Choose a different spectral peak (resets averaging). */
  const pick = useCallback((f: number) => {
    setTaps([f])
    setFreq(f)
  }, [])

  /** Set the frequency directly (manual adjust, history, tuner lock). */
  const setFrequency = useCallback((f: number) => setFreq(f), [])

  return { status, spec, peaks, taps, freq, listen, cancel, pick, setFrequency }
}
