// Collects mono microphone input into 2048-sample chunks and posts them to the main thread.
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.size = 2048
    this.buf = new Float32Array(this.size)
    this.len = 0
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      let i = 0
      while (i < ch.length) {
        const n = Math.min(ch.length - i, this.size - this.len)
        this.buf.set(ch.subarray(i, i + n), this.len)
        this.len += n
        i += n
        if (this.len === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer])
          this.buf = new Float32Array(this.size)
          this.len = 0
        }
      }
    }
    return true
  }
}

registerProcessor('fiona-capture', CaptureProcessor)
