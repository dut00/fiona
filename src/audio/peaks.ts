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

/**
 * Find the strongest local maxima in [fMin, fMax].
 * A bin counts as a peak if it is the maximum within ±separationHz and rises at least
 * prominenceDb above the quietest point of that neighbourhood.
 */
export function findPeaks(
  spec: Spectrum,
  { fMin = 200, fMax = 8000, count = 6, separationHz = 15, prominenceDb = 10, maxBelowTopDb = 40 } = {},
): Peak[] {
  const { db, binHz } = spec
  const kMin = Math.max(1, Math.floor(fMin / binHz))
  const kMax = Math.min(db.length - 2, Math.ceil(fMax / binHz))
  const w = Math.max(1, Math.round(separationHz / binHz))
  const found: Peak[] = []

  for (let k = kMin; k <= kMax; k++) {
    const v = db[k]
    if (v < db[k - 1] || v < db[k + 1]) continue
    let isMax = true
    let floor = v
    const lo = Math.max(0, k - w)
    const hi = Math.min(db.length - 1, k + w)
    for (let j = lo; j <= hi; j++) {
      if (db[j] > v) {
        isMax = false
        break
      }
      if (db[j] < floor) floor = db[j]
    }
    if (!isMax || v - floor < prominenceDb) continue
    found.push(interpolatePeak(db, k, binHz))
    k += w
  }

  found.sort((x, y) => y.db - x.db)
  // Drop noise-floor ripples far below the dominant peak.
  const top = found[0]?.db ?? 0
  return found.filter((p) => top - p.db <= maxBelowTopDb).slice(0, count)
}
