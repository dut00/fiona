import { useEffect, useRef } from 'react'
import { mic } from '../audio/engine'

const MIN_DB = -80

/** Live microphone level bar with a peak-hold marker. Updates via rAF without re-rendering React. */
export function LevelMeter({ label }: { label: string }) {
  const barRef = useRef<HTMLDivElement>(null)
  const holdRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let hold = MIN_DB
    let holdT = 0
    const tick = (t: number) => {
      const db = mic.active ? mic.levelDb() : MIN_DB
      const pct = Math.max(0, Math.min(1, (db - MIN_DB) / -MIN_DB)) * 100
      if (db > hold || t - holdT > 1500) {
        hold = db
        holdT = t
      }
      const holdPct = Math.max(0, Math.min(1, (hold - MIN_DB) / -MIN_DB)) * 100
      if (barRef.current) barRef.current.style.width = `${pct}%`
      if (holdRef.current) holdRef.current.style.left = `${holdPct}%`
      if (textRef.current) textRef.current.textContent = mic.active ? `${db.toFixed(0)} dBFS` : '—'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span ref={textRef} className="tabular-nums" />
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-pink-500"
          style={{ width: 0 }}
        />
        <div ref={holdRef} className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: 0 }} />
      </div>
    </div>
  )
}
