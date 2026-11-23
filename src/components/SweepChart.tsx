import type { SweepPoint } from '../audio/tuner'

/** Response-vs-frequency curve recorded during the tuning sweep. */
export function SweepChart({ points, current }: { points: SweepPoint[]; current?: number }) {
  if (points.length < 2) return <div className="h-20 rounded-xl bg-slate-900/60" />
  const fs = points.map((p) => p.freq)
  const as = points.map((p) => p.amp)
  const f0 = Math.min(...fs)
  const f1 = Math.max(...fs)
  const a0 = Math.min(...as)
  const a1 = Math.max(...as)
  const W = 300
  const H = 80
  const x = (f: number) => ((f - f0) / (f1 - f0 || 1)) * W
  const y = (a: number) => H - 6 - ((a - a0) / (a1 - a0 || 1)) * (H - 12)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.freq).toFixed(1)},${y(p.amp).toFixed(1)}`).join(' ')
  const best = points.reduce((b, p) => (p.amp > b.amp ? p : b), points[0])

  return (
    <div className="rounded-xl bg-slate-900/60 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke="#f9a8d4" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={x(best.freq)} x2={x(best.freq)} y1={0} y2={H} stroke="#22d3ee" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        {current !== undefined && current >= f0 && current <= f1 && (
          <line x1={x(current)} x2={x(current)} y1={0} y2={H} stroke="white" strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
        <span>{f0.toFixed(1)} Hz</span>
        <span className="text-cyan-300">{best.freq.toFixed(2)} Hz</span>
        <span>{f1.toFixed(1)} Hz</span>
      </div>
    </div>
  )
}
