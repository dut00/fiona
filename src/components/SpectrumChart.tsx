import { useEffect, useRef } from 'react'
import type { Spectrum } from '../audio/fft'
import type { Peak } from '../audio/peaks'

const F_MIN = 100
const F_MAX = 10000
const RANGE_DB = 70

const xOf = (f: number, w: number) => (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * w
const fOf = (x: number, w: number) => F_MIN * Math.pow(F_MAX / F_MIN, x / w)

interface Props {
  spec: Spectrum
  peaks: Peak[]
  selected: number | null
  onPick: (f: number) => void
  /** Range searched for peaks; everything outside is dimmed */
  searchRange: [number, number]
}

export function SpectrumChart({ spec, peaks, selected, onPick, searchRange }: Props) {
  const [searchMin, searchMax] = searchRange
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const g = canvas.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const { db, binHz } = spec
      const kLo = Math.floor(F_MIN / binHz)
      const kHi = Math.min(db.length - 1, Math.ceil(F_MAX / binHz))
      let maxDb = -Infinity
      for (let k = kLo; k <= kHi; k++) if (db[k] > maxDb) maxDb = db[k]
      const minDb = maxDb - RANGE_DB
      const yOf = (v: number) => h - 14 - ((Math.max(v, minDb) - minDb) / RANGE_DB) * (h - 24)

      // grid
      g.strokeStyle = 'rgba(148,163,184,0.15)'
      g.fillStyle = 'rgba(148,163,184,0.6)'
      g.font = '10px system-ui, sans-serif'
      g.lineWidth = 1
      for (const f of [200, 500, 1000, 2000, 5000]) {
        const x = Math.round(xOf(f, w)) + 0.5
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, h - 12)
        g.stroke()
        g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x + 2, h - 2)
      }

      // spectrum: max over bins per pixel column
      const grad = g.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(244,114,182,0.55)')
      grad.addColorStop(1, 'rgba(34,211,238,0.05)')
      g.beginPath()
      g.moveTo(0, h - 14)
      for (let x = 0; x < w; x++) {
        const k0 = Math.max(1, Math.floor(fOf(x, w) / binHz))
        const k1 = Math.max(k0, Math.floor(fOf(x + 1, w) / binHz))
        let v = -Infinity
        for (let k = k0; k <= k1 && k < db.length; k++) if (db[k] > v) v = db[k]
        g.lineTo(x, yOf(v))
      }
      g.lineTo(w, h - 14)
      g.closePath()
      g.fillStyle = grad
      g.fill()
      g.strokeStyle = '#f9a8d4'
      g.stroke()

      // dim the ranges that are not searched for peaks
      g.fillStyle = 'rgba(2,6,23,0.6)'
      g.strokeStyle = 'rgba(148,163,184,0.35)'
      g.setLineDash([2, 3])
      for (const [x0, x1, edge] of [
        [0, xOf(searchMin, w), xOf(searchMin, w)],
        [xOf(searchMax, w), w, xOf(searchMax, w)],
      ]) {
        g.fillRect(x0, 0, x1 - x0, h - 12)
        g.beginPath()
        g.moveTo(Math.round(edge) + 0.5, 0)
        g.lineTo(Math.round(edge) + 0.5, h - 12)
        g.stroke()
      }
      g.setLineDash([])

      // peaks
      for (const p of peaks) {
        const x = xOf(p.freq, w)
        const y = yOf(p.db)
        const isSel = selected !== null && Math.abs(p.freq - selected) / selected < 0.03
        g.beginPath()
        g.arc(x, y, isSel ? 6 : 4, 0, Math.PI * 2)
        g.fillStyle = isSel ? '#22d3ee' : 'rgba(226,232,240,0.8)'
        g.fill()
        if (isSel) {
          g.strokeStyle = 'rgba(34,211,238,0.5)'
          g.setLineDash([3, 3])
          g.beginPath()
          g.moveTo(x, y + 6)
          g.lineTo(x, h - 14)
          g.stroke()
          g.setLineDash([])
        }
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [spec, peaks, selected, searchMin, searchMax])

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let best: Peak | null = null
    let bestDist = 28
    for (const p of peaks) {
      const d = Math.abs(xOf(p.freq, rect.width) - x)
      if (d < bestDist) {
        bestDist = d
        best = p
      }
    }
    if (best) onPick(best.freq)
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointer}
      className="w-full h-40 rounded-xl bg-slate-900/60 touch-manipulation cursor-pointer"
      role="img"
      aria-label="Spectrum"
    />
  )
}
