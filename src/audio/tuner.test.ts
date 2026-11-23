import { describe, expect, it } from 'vitest'
import { findResonance, type Measure } from './tuner'

/** Simulated speaker + glass: flat speaker response plus a Lorentzian resonance and noise. */
function fakeGlass(resonance: number, bandwidth: number, noise = 0.01): Measure {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  return async (f) => {
    const x = (f - resonance) / (bandwidth / 2)
    return 0.2 + 0.5 / (1 + x * x) + noise * rand()
  }
}

describe('findResonance', () => {
  it('locks within 0.1 Hz of a sharp resonance offset from the tap estimate', async () => {
    const f = await findResonance(fakeGlass(813.37, 0.8), 811.2, new AbortController().signal)
    expect(Math.abs(f - 813.37)).toBeLessThan(0.1)
  })

  it('can be aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(findResonance(fakeGlass(500, 1), 500, ctrl.signal)).rejects.toThrow()
  })
})
