import { describe, expect, it } from 'vitest'
import { findResonance, type Measure } from './tuner'

/** Simulated speaker + glass: flat speaker response plus a Lorentzian resonance and noise. */
function fakeGlass(resonance: number, bandwidth: number, noise = 0.01) {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  let calls = 0
  const measure: Measure = async (f) => {
    calls++
    const x = (f - resonance) / (bandwidth / 2)
    return 0.2 + 0.5 / (1 + x * x) + noise * rand()
  }
  return { measure, calls: () => calls }
}

const signal = () => new AbortController().signal

describe('findResonance', () => {
  for (const [res, tap] of [
    [813.37, 813.2],
    [813.37, 812.1],
    [813.37, 811.2],
    [523.9, 524.6],
  ] as const) {
    it(`locks within 0.1 Hz (resonance ${res}, tap estimate ${tap}) in few measurements`, async () => {
      const g = fakeGlass(res, 0.8)
      const r = await findResonance(g.measure, tap, signal())
      expect(Math.abs(r.freq - res)).toBeLessThan(0.1)
      expect(g.calls()).toBeLessThanOrEqual(30)
      expect(r.gainDb).toBeGreaterThan(3)
    })
  }

  it('finishes quickly when the tap estimate is already close', async () => {
    const g = fakeGlass(700, 0.8)
    await findResonance(g.measure, 700.05, signal())
    // 7 scan points + a handful of climb steps ≈ 3 s at 200 ms each
    expect(g.calls()).toBeLessThanOrEqual(17)
  })

  it('can be aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(findResonance(fakeGlass(500, 1).measure, 500, ctrl.signal)).rejects.toThrow()
  })
})
