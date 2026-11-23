import { rms } from './goertzel'

export interface TapDetectorOptions {
  sampleRate: number
  /** Onset when frame RMS exceeds the noise floor times this factor */
  onsetFactor?: number
  /** Absolute minimum RMS that counts as a tap */
  minRms?: number
  /** Skip the broadband click of the impact itself */
  skipMs?: number
  /** Length of the decaying ring to capture */
  captureMs?: number
  frameSize?: number
}

/**
 * Streaming tap detector. Feed microphone chunks via push(); once a tap has been detected and
 * enough of its ring-down collected, push() returns the captured samples (exactly once).
 */
export class TapDetector {
  private readonly frameSize: number
  private readonly onsetFactor: number
  private readonly minRms: number
  private readonly skip: number
  private readonly capture: number
  private noiseFloor = -1
  private pending = new Float32Array(0)
  private captured: Float32Array | null = null
  private capturedLen = 0
  private toSkip = 0
  done = false

  constructor(o: TapDetectorOptions) {
    this.frameSize = o.frameSize ?? 256
    this.onsetFactor = o.onsetFactor ?? 6
    this.minRms = o.minRms ?? 0.01
    this.skip = Math.round(((o.skipMs ?? 20) / 1000) * o.sampleRate)
    this.capture = Math.round(((o.captureMs ?? 1000) / 1000) * o.sampleRate)
  }

  push(chunk: Float32Array): Float32Array | null {
    if (this.done) return null
    if (this.captured) return this.collect(chunk)

    const buf = new Float32Array(this.pending.length + chunk.length)
    buf.set(this.pending)
    buf.set(chunk, this.pending.length)

    let i = 0
    for (; i + this.frameSize <= buf.length; i += this.frameSize) {
      const r = rms(buf, i, i + this.frameSize)
      if (this.noiseFloor < 0) {
        this.noiseFloor = r
        continue
      }
      if (r > this.minRms && r > this.noiseFloor * this.onsetFactor) {
        this.captured = new Float32Array(this.capture)
        this.toSkip = this.skip
        this.pending = new Float32Array(0)
        return this.collect(buf.subarray(i))
      }
      this.noiseFloor = this.noiseFloor * 0.95 + r * 0.05
    }
    this.pending = buf.slice(i)
    return null
  }

  private collect(chunk: Float32Array): Float32Array | null {
    let data = chunk
    if (this.toSkip > 0) {
      const s = Math.min(this.toSkip, data.length)
      this.toSkip -= s
      data = data.subarray(s)
    }
    const cap = this.captured!
    const n = Math.min(data.length, cap.length - this.capturedLen)
    cap.set(data.subarray(0, n), this.capturedLen)
    this.capturedLen += n
    if (this.capturedLen >= cap.length) {
      this.done = true
      return cap
    }
    return null
  }
}
