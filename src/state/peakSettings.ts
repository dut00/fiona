import { useCallback, useState } from 'react'
import { DEFAULT_PEAK_OPTIONS, type PeakOptions } from '../audio/peaks'
import { storageGet, storageSet } from './history'

const KEY = 'fiona.peaks.v1'

/** UI limits for each option; also used to sanitise values loaded from storage. */
export const PEAK_LIMITS: Record<keyof PeakOptions, { min: number; max: number; step: number }> = {
  fMin: { min: 100, max: 1000, step: 10 },
  fMax: { min: 1000, max: 10000, step: 100 },
  count: { min: 1, max: 10, step: 1 },
  separationRel: { min: 0.005, max: 0.1, step: 0.005 },
  separationHz: { min: 1, max: 50, step: 1 },
  prominenceDb: { min: 0, max: 40, step: 1 },
  neighbourhoodRel: { min: 0.02, max: 0.3, step: 0.01 },
  maxBelowTopDb: { min: 5, max: 60, step: 1 },
}

const clamp = (k: keyof PeakOptions, v: unknown) => {
  const { min, max } = PEAK_LIMITS[k]
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : DEFAULT_PEAK_OPTIONS[k]
}

function load(): PeakOptions {
  const out = { ...DEFAULT_PEAK_OPTIONS }
  try {
    const raw = JSON.parse(storageGet(KEY) ?? '{}')
    for (const k of Object.keys(out) as (keyof PeakOptions)[]) if (k in raw) out[k] = clamp(k, raw[k])
  } catch {
    /* corrupted → defaults */
  }
  return out
}

/** Peak-detection options chosen by the user, persisted in localStorage. */
export function usePeakSettings() {
  const [options, setOptions] = useState<PeakOptions>(load)

  const set = useCallback(<K extends keyof PeakOptions>(key: K, value: number) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: clamp(key, value) }
      storageSet(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setOptions({ ...DEFAULT_PEAK_OPTIONS })
    storageSet(KEY, JSON.stringify(DEFAULT_PEAK_OPTIONS))
  }, [])

  const isDefault = (Object.keys(DEFAULT_PEAK_OPTIONS) as (keyof PeakOptions)[]).every(
    (k) => options[k] === DEFAULT_PEAK_OPTIONS[k],
  )

  return { options, set, reset, isDefault }
}
