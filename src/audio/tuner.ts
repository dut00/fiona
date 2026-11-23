/**
 * Resonance tuner: while a tone plays, step its frequency around the tap estimate and measure
 * (via the microphone) how strongly the object answers at each step. The object's ringing adds
 * to the speaker's direct sound, so in a narrow window — where the speaker response is flat —
 * the maximum of the measured amplitude marks the resonance.
 */

/** Plays `freq`, waits for the object to respond, returns measured amplitude at `freq`. */
export type Measure = (freq: number, dwellMs: number, signal: AbortSignal) => Promise<number>

export interface SweepPoint {
  freq: number
  amp: number
}

export interface TunerProgress {
  stage: 'coarse' | 'fine' | 'track'
  point: SweepPoint
  points: SweepPoint[]
  best: SweepPoint
}

function range(center: number, span: number, step: number): number[] {
  const out: number[] = []
  const n = Math.round(span / step)
  for (let i = -n; i <= n; i++) out.push(+(center + i * step).toFixed(3))
  return out
}

/** Light smoothing so a single noisy reading can't win the sweep. */
function smoothedBest(points: SweepPoint[]): SweepPoint {
  let best = points[0]
  let bestScore = -Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i - 1]?.amp ?? points[i].amp
    const c = points[i + 1]?.amp ?? points[i].amp
    const score = 0.25 * a + 0.5 * points[i].amp + 0.25 * c
    if (score > bestScore) {
      bestScore = score
      best = points[i]
    }
  }
  return best
}

async function sweep(
  measure: Measure,
  freqs: number[],
  dwellMs: number,
  stage: TunerProgress['stage'],
  signal: AbortSignal,
  onProgress?: (p: TunerProgress) => void,
): Promise<SweepPoint> {
  const points: SweepPoint[] = []
  let best: SweepPoint = { freq: freqs[0], amp: -Infinity }
  for (const freq of freqs) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const amp = await measure(freq, dwellMs, signal)
    const point = { freq, amp }
    points.push(point)
    if (amp > best.amp) best = point
    onProgress?.({ stage, point, points, best })
  }
  return smoothedBest(points)
}

export interface TuneOptions {
  coarseSpan?: number
  coarseStep?: number
  coarseDwellMs?: number
  fineSpan?: number
  fineStep?: number
  fineDwellMs?: number
}

/** Coarse sweep then fine sweep around the winner. Returns the resonance estimate. */
export async function findResonance(
  measure: Measure,
  center: number,
  signal: AbortSignal,
  onProgress?: (p: TunerProgress) => void,
  o: TuneOptions = {},
): Promise<number> {
  const coarse = await sweep(
    measure,
    range(center, o.coarseSpan ?? 5, o.coarseStep ?? 0.2),
    o.coarseDwellMs ?? 250,
    'coarse',
    signal,
    onProgress,
  )
  const fine = await sweep(
    measure,
    range(coarse.freq, o.fineSpan ?? 0.6, o.fineStep ?? 0.05),
    o.fineDwellMs ?? 400,
    'fine',
    signal,
    onProgress,
  )
  return fine.freq
}

/**
 * Hill-climbing tracker: keep driving at the resonance and follow it as it drifts
 * (temperature, liquid, fingers on the glass). Runs until aborted.
 */
export async function trackResonance(
  measure: Measure,
  start: number,
  signal: AbortSignal,
  onUpdate?: (freq: number, amp: number) => void,
  { delta = 0.05, dwellMs = 500, holdMs = 2000 } = {},
): Promise<void> {
  let f = start
  while (!signal.aborted) {
    const center = await measure(f, holdMs, signal)
    onUpdate?.(f, center)
    const lower = await measure(f - delta, dwellMs, signal)
    const upper = await measure(f + delta, dwellMs, signal)
    if (upper > center && upper >= lower) f = +(f + delta).toFixed(3)
    else if (lower > center) f = +(f - delta).toFixed(3)
  }
}
