import { useState } from 'react'
import { useI18n } from '../i18n'

const FEATHERS = Array.from({ length: 12 }, (_, i) => i)

/**
 * Original cartoon: a little bird sings along, inflates on the high note and goes "poof" —
 * only its legs are left standing. Timeline lives in index.css (.egg-*).
 */
export function FionaEgg({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [run, setRun] = useState(0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 text-center" onClick={(e) => e.stopPropagation()}>
        {/* key remounts the scene so "Encore" replays the animation */}
        <div key={run} className="relative mx-auto h-44 w-44">
          {/* legs — drawn under the body, they stay after the pop (176×176 = scene box) */}
          <svg viewBox="0 0 176 176" className="egg-legs absolute inset-0 h-full w-full" aria-hidden>
            <g stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M82 116 L80 150 M80 150 L71 155 M80 150 L80 157 M80 150 L88 155" />
              <path d="M94 116 L96 150 M96 150 L88 155 M96 150 L96 157 M96 150 L105 155" />
            </g>
          </svg>

          {/* notes — hidden as soon as the bird is gone */}
          <div className="egg-notes absolute inset-0">
            {['♪', '♫', '♪'].map((n, i) => (
              <span
                key={i}
                className="egg-note absolute text-2xl text-pink-300"
                style={{ left: `${20 + i * 30}%`, top: '10%', animationDelay: `${i * 0.3}s` }}
              >
                {n}
              </span>
            ))}
          </div>

          {/* bird */}
          <svg viewBox="0 0 100 100" className="egg-bird absolute inset-0 m-auto h-28 w-28" aria-hidden>
            <ellipse cx="50" cy="58" rx="30" ry="26" fill="#93c5fd" />
            <ellipse cx="42" cy="64" rx="14" ry="10" fill="#bfdbfe" />
            <circle cx="62" cy="48" r="5" fill="#0f172a" />
            <circle cx="63.5" cy="46.5" r="1.6" fill="white" />
            <path d="M76 52 L92 50 L76 58 Z" fill="#fbbf24" />
            <path d="M30 40 Q24 28 36 30" stroke="#60a5fa" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>

          {/* feathers after the pop */}
          {FEATHERS.map((i) => {
            const a = (i / FEATHERS.length) * Math.PI * 2
            return (
              <span
                key={i}
                className="egg-feather absolute left-1/2 top-1/2 h-3 w-1.5 rounded-full bg-sky-300"
                style={
                  {
                    '--dx': `${Math.cos(a) * 80}px`,
                    '--dy': `${Math.sin(a) * 80}px`,
                    '--rot': `${(i * 67) % 360}deg`,
                  } as React.CSSProperties
                }
              />
            )
          })}
        </div>

        <h2 className="mt-2 text-2xl font-bold text-pink-300">{t('eggTitle')}</h2>
        <p className="mt-2 text-slate-300">{t('eggText')}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={() => setRun((r) => r + 1)} className="rounded-2xl bg-pink-600 py-3 font-semibold text-white active:scale-[0.98] transition">
            ↺ {t('eggReplay')}
          </button>
          <button onClick={onClose} className="rounded-2xl bg-slate-800 py-3 font-semibold text-slate-100">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
