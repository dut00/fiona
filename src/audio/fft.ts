/** In-place iterative radix-2 FFT. `re` and `im` must have the same power-of-two length. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  if (n !== im.length || (n & (n - 1)) !== 0) throw new Error('FFT size must be a power of two')

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < half; k++) {
        const a = i + k
        const b = a + half
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

export interface Spectrum {
  /** Magnitude in dB for bins 0..fftSize/2 */
  db: Float32Array
  /** Width of one bin in Hz */
  binHz: number
  sampleRate: number
}

export function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/**
 * Hann-windowed, zero-padded magnitude spectrum of a real signal.
 * Zero-padding interpolates the spectrum so parabolic peak fitting becomes very accurate.
 */
export function spectrum(samples: Float32Array, sampleRate: number, minFftSize = 65536): Spectrum {
  const n = samples.length
  const size = Math.max(minFftSize, nextPow2(n))
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    re[i] = samples[i] * w
  }
  fft(re, im)
  const half = size / 2
  const db = new Float32Array(half + 1)
  for (let k = 0; k <= half; k++) {
    db[k] = 20 * Math.log10(Math.hypot(re[k], im[k]) + 1e-12)
  }
  return { db, binHz: sampleRate / size, sampleRate }
}
