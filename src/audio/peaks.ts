import type { Spectrum } from './fft'

export interface Peak {
  freq: number
  db: number
}

/** Parabolic interpolation of a peak at bin k using its neighbours (on dB values). */
export function interpolatePeak(db: Float32Array, k: number, binHz: number): Peak {
  const a = db[k - 1]
  const b = db[k]
  const c = db[k + 1]
  const denom = a - 2 * b + c
  const p = denom === 0 ? 0 : (0.5 * (a - c)) / denom
  return { freq: (k + p) * binHz, db: b - 0.25 * (a - c) * p }
}

export interface PeakOptions {
  /** Searched frequency range (also shaded on the spectrum chart) */
  fMin: number
  fMax: number
  /** Max number of peaks returned */
  count: number
  /** A peak must be the highest bin within ±this fraction of its frequency (0.03 ≈ half a semitone) */
  separationRel: number
  /** ...and within at least ±this many Hz (matters at low frequencies) */
  separationHz: number
  /** Required height above the median level of the surrounding ±neighbourhoodRel band */
  prominenceDb: number
  neighbourhoodRel: number
  /** Drop peaks this far below the strongest one */
  maxBelowTopDb: number
}

export type FindPeaksOptions = Partial<PeakOptions>

export const DEFAULT_PEAK_OPTIONS: Readonly<PeakOptions> = {
  fMin: 150,
  fMax: 6000,
  count: 5,
  separationRel: 0.03,
  separationHz: 15,
  prominenceDb: 18,
  neighbourhoodRel: 0.1,
  maxBelowTopDb: 30,
}

/**
 * Find resonances in [fMin, fMax].
 *
 * A struck glass rings at a few sharp, well separated modes that stand far above the
 * surrounding spectrum. Room noise and the thud of the impact produce a dense comb of small
 * local maxima instead. So a bin only counts as a peak if it is
 *  - the maximum within ±separationRel of its frequency (no clusters of neighbouring dots), and
 *  - at least prominenceDb above the median of its ±neighbourhoodRel band (ignoring ±1 %
 *    around the peak itself), which rejects noise humps.
 */
export function findPeaks(spec: Spectrum, options: FindPeaksOptions = {}): Peak[] {
  const { fMin, fMax, count, separationRel, separationHz, prominenceDb, neighbourhoodRel, maxBelowTopDb } = {
    ...DEFAULT_PEAK_OPTIONS,
    ...options,
  }
  const { db, binHz } = spec
  const last = db.length - 1
  const kMin = Math.max(1, Math.floor(fMin / binHz))
  const kMax = Math.min(last - 1, Math.ceil(fMax / binHz))
  const found: Peak[] = []

  for (let k = kMin; k <= kMax; k++) {
    const v = db[k]
    if (v < db[k - 1] || v < db[k + 1]) continue
    const f = k * binHz

    const w = Math.max(1, Math.round(Math.max(separationHz, f * separationRel) / binHz))
    let isMax = true
    for (let j = Math.max(0, k - w); j <= Math.min(last, k + w); j++) {
      if (db[j] > v) {
        isMax = false
        break
      }
    }
    if (!isMax) continue

    const n = Math.max(w + 1, Math.round((f * neighbourhoodRel) / binHz))
    const core = Math.max(2, Math.round((f * 0.01) / binHz))
    const around: number[] = []
    for (let j = Math.max(0, k - n); j <= Math.min(last, k + n); j++) if (Math.abs(j - k) > core) around.push(db[j])
    if (v - median(around) < prominenceDb) continue

    found.push(interpolatePeak(db, k, binHz))
    k += w
  }

  found.sort((x, y) => y.db - x.db)
  const top = found[0]?.db ?? 0
  return found.filter((p) => top - p.db <= maxBelowTopDb).slice(0, count)
}

function median(values: number[]): number {
  if (values.length === 0) return -Infinity
  const s = values.slice().sort((a, b) => a - b)
  return s[s.length >> 1]
}
