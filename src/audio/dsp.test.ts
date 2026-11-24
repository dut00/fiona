import { describe, expect, it } from 'vitest'
import { spectrum } from './fft'
import { findPeaks } from './peaks'
import { goertzel } from './goertzel'
import { TapDetector } from './tapDetector'

function makeRand(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
}

function ring(
  freq: number,
  sr: number,
  seconds: number,
  { decay = 3, noise = 0.01, amp = 0.5, partials = [] as [number, number][] } = {},
) {
  const n = Math.round(sr * seconds)
  const out = new Float32Array(n)
  const rand = makeRand()
  for (let i = 0; i < n; i++) {
    const t = i / sr
    let v = Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t + 0.3)
    for (const [f, a] of partials) v += a * Math.exp(-decay * 1.5 * t) * Math.sin(2 * Math.PI * f * t)
    out[i] = amp * v + noise * rand()
  }
  return out
}

describe('spectrum + findPeaks', () => {
  for (const sr of [44100, 48000]) {
    for (const f of [523.25, 812.4, 1377.7, 2501.1]) {
      it(`finds ${f} Hz at ${sr} Hz within 0.2 Hz`, () => {
        const peaks = findPeaks(spectrum(ring(f, sr, 1), sr))
        expect(Math.abs(peaks[0].freq - f)).toBeLessThan(0.2)
      })
    }
  }

  it('ranks the fundamental first and also reports weaker partials', () => {
    const sr = 48000
    const sig = ring(700, sr, 1, { partials: [[1930, 0.3], [3650, 0.15]] })
    const peaks = findPeaks(spectrum(sig, sr))
    expect(Math.abs(peaks[0].freq - 700)).toBeLessThan(0.2)
    expect(peaks.some((p) => Math.abs(p.freq - 1930) < 0.5)).toBe(true)
  })

  it('reports one peak for a cluster of neighbouring modes (no stacked dots)', () => {
    // Real recording: 1765.6 Hz with a weaker neighbour at 1736.4 Hz (1.6 % apart).
    const sr = 48000
    const sig = ring(1765.6, sr, 1, { partials: [[1736.4, 0.1], [4430, 0.2], [4410, 0.08], [4462, 0.05]] })
    const peaks = findPeaks(spectrum(sig, sr))
    expect(Math.abs(peaks[0].freq - 1765.6)).toBeLessThan(0.2)
    for (const a of peaks)
      for (const b of peaks) if (a !== b) expect(Math.abs(a.freq - b.freq) / a.freq).toBeGreaterThan(0.03)
  })

  it('ignores a loud low-frequency noise hump (thud, hum)', () => {
    const sr = 48000
    const sig = ring(1200, sr, 1, { amp: 0.2, noise: 0 })
    // one-pole low-pass of white noise: strong, irregular energy below ~300 Hz
    const rand = makeRand(7)
    const a = Math.exp((-2 * Math.PI * 250) / sr)
    let y = 0
    for (let i = 0; i < sig.length; i++) {
      y = a * y + (1 - a) * rand()
      sig[i] += 4 * y
    }
    const peaks = findPeaks(spectrum(sig, sr))
    expect(Math.abs(peaks[0].freq - 1200)).toBeLessThan(0.3)
    expect(peaks.every((p) => p.freq > 1000)).toBe(true)
  })
})

describe('goertzel', () => {
  it('measures amplitude of a sine and rejects off-frequency content', () => {
    const sr = 48000
    const n = 4800
    const s = new Float32Array(n)
    for (let i = 0; i < n; i++) s[i] = 0.4 * Math.sin((2 * Math.PI * 1000 * i) / sr)
    expect(goertzel(s, 1000, sr)).toBeCloseTo(0.4, 2)
    expect(goertzel(s, 1100, sr)).toBeLessThan(0.01)
  })
})

describe('TapDetector', () => {
  it('captures the ring-down after a tap in streamed chunks', () => {
    const sr = 48000
    const silence = ring(0, sr, 0.5, { noise: 0.002, amp: 0 })
    const tap = ring(900, sr, 1.5, { noise: 0.002 })
    const all = new Float32Array(silence.length + tap.length)
    all.set(silence)
    all.set(tap, silence.length)
    const det = new TapDetector({ sampleRate: sr })
    let out: Float32Array | null = null
    for (let i = 0; i < all.length && !out; i += 512) out = det.push(all.subarray(i, i + 512))
    expect(out).not.toBeNull()
    expect(out!.length).toBe(sr)
    const peaks = findPeaks(spectrum(out!, sr))
    expect(Math.abs(peaks[0].freq - 900)).toBeLessThan(0.2)
  })

  it('does not trigger on steady noise', () => {
    const sr = 48000
    const det = new TapDetector({ sampleRate: sr })
    const noise = ring(0, sr, 2, { noise: 0.05, amp: 0 })
    let out: Float32Array | null = null
    for (let i = 0; i < noise.length && !out; i += 512) out = det.push(noise.subarray(i, i + 512))
    expect(out).toBeNull()
  })
})
