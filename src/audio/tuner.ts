/**
 * Resonance tuner: while a tone plays, change its frequency around the tap estimate and measure
 * (via the microphone) how strongly the object answers. The object's ringing adds to the
 * speaker's direct sound, so in a narrow window — where the speaker response is flat — the
 * maximum of the measured amplitude marks the resonance.
 *
 * Strategy (≈15 measurements, ~3 s):
 *  1. quick scan of a few points around the estimate (robust to a tap estimate ~1.5 Hz off),
 *  2. hill-climb from the best point, halving the step whenever the centre beats both
 *     neighbours, until the step is below `minStep` — then it is done.
 */

/** Plays `freq`, waits for the object to respond, returns measured amplitude at `freq`. */
export type Measure = (freq: number, dwellMs: number, signal: AbortSignal) => Promise<number>

export interface SweepPoint {
  freq: number
  amp: number
}

export interface TunerProgress {
  stage: 'scan' | 'climb'
  point: SweepPoint
  /** All measurements so far, sorted by frequency */
  points: SweepPoint[]
}

export interface TuneResult {
  freq: number
  /** How much louder the response at the resonance is than the weakest measurement */
  gainDb: number
  points: SweepPoint[]
}

export interface TuneOptions {
  scanSpan?: number
  scanStep?: number
  initialStep?: number
  minStep?: number
  firstDwellMs?: number
  dwellMs?: number
  maxMeasurements?: number
}

const key = (f: number) => f.toFixed(3)

export async function findResonance(
  measure: Measure,
  center: number,
  signal: AbortSignal,
  onProgress?: (p: TunerProgress) => void,
  {
    scanSpan = 1.5,
    scanStep = 0.5,
    initialStep = 0.25,
    minStep = 0.05,
    // first reading waits out the tone's fade-in and lets the object start ringing
    firstDwellMs = 400,
    dwellMs = 200,
    maxMeasurements = 30,
  }: TuneOptions = {},
): Promise<TuneResult> {
  const cache = new Map<string, SweepPoint>()
  let stage: TunerProgress['stage'] = 'scan'

  const at = async (f: number): Promise<number> => {
    f = +f.toFixed(3)
    const hit = cache.get(key(f))
    if (hit) return hit.amp
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const amp = await measure(f, cache.size === 0 ? firstDwellMs : dwellMs, signal)
    const point = { freq: f, amp }
    cache.set(key(f), point)
    const points = [...cache.values()].sort((a, b) => a.freq - b.freq)
    onProgress?.({ stage, point, points })
    return amp
  }

  // 1. scan: centre first, then outwards
  let f = center
  let best = await at(center)
  for (let d = scanStep; d <= scanSpan + 1e-9; d += scanStep) {
    for (const cand of [center + d, center - d]) {
      const a = await at(cand)
      if (a > best) {
        best = a
        f = cand
      }
    }
  }

  // 2. hill-climb with shrinking step
  stage = 'climb'
  let step = initialStep
  while (step >= minStep && cache.size < maxMeasurements) {
    const up = await at(f + step)
    const down = await at(f - step)
    if (up > best && up >= down) {
      f += step
      best = up
    } else if (down > best) {
      f -= step
      best = down
    } else {
      step /= 2
    }
  }

  const points = [...cache.values()].sort((a, b) => a.freq - b.freq)
  const top = points.reduce((b, p) => (p.amp > b.amp ? p : b), points[0])
  const low = Math.min(...points.map((p) => p.amp))
  return {
    freq: top.freq,
    gainDb: low > 0 ? 20 * Math.log10(top.amp / low) : 0,
    points,
  }
}
