/** Amplitude of a single (possibly non-integer-bin) frequency in a block, Hann-windowed. */
export function goertzel(samples: Float32Array, freq: number, sampleRate: number): number {
  const n = samples.length
  if (n < 2) return 0
  const omega = (2 * Math.PI * freq) / sampleRate
  const coeff = 2 * Math.cos(omega)
  let s1 = 0
  let s2 = 0
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    const s0 = samples[i] * w + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2
  // Hann coherent gain is 0.5 → amplitude = 2·|X| / (n·0.5)
  return (4 * Math.sqrt(Math.max(0, power))) / n
}

export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / Math.max(1, end - start))
}

export function toDb(amplitude: number): number {
  return 20 * Math.log10(amplitude + 1e-9)
}
