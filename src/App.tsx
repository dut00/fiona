import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from './i18n'
import { LangSwitch } from './components/LangSwitch'
import { WarningGate } from './components/WarningGate'
import { SpectrumChart } from './components/SpectrumChart'
import { LevelMeter } from './components/LevelMeter'
import { SweepChart } from './components/SweepChart'
import { History } from './components/History'
import { FionaEgg } from './components/FionaEgg'
import { About, AboutButton } from './components/About'
import { useMeasure } from './state/useMeasure'
import { LOUD_VOLUME, usePlayer } from './state/usePlayer'
import { storageGet, storageSet } from './state/history'

const CONSENT_KEY = 'fiona.consent.v1'
/** Glass response this far above the sweep median counts as "singing" → easter egg. */
const EGG_GAIN_DB = 6

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function App() {
  const [consent, setConsent] = useState(() => storageGet(CONSENT_KEY) === '1')
  if (!consent)
    return (
      <WarningGate
        onAccept={() => {
          storageSet(CONSENT_KEY, '1')
          setConsent(true)
        }}
      />
    )
  return <Main />
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-4 space-y-4">{children}</section>
}

function Main() {
  const { t } = useI18n()
  const m = useMeasure()
  const p = usePlayer(m.freq, m.setFrequency)
  const [egg, setEgg] = useState(false)
  const [about, setAbout] = useState(false)
  const closeAbout = useCallback(() => setAbout(false), [])
  const logoTaps = useRef<number[]>([])

  const listening = m.status.kind === 'listening'
  const busy = p.mode !== 'off'

  useEffect(() => {
    if (p.gainDb !== null && p.gainDb >= EGG_GAIN_DB) setEgg(true)
  }, [p.gainDb])

  const onLogo = () => {
    const now = Date.now()
    logoTaps.current = [...logoTaps.current.filter((x) => now - x < 2000), now]
    if (logoTaps.current.length >= 5) {
      logoTaps.current = []
      setEgg(true)
    }
  }

  const nudge = (d: number) => m.freq !== null && m.setFrequency(Math.max(20, +(m.freq + d).toFixed(2)))

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <button onClick={onLogo} className="flex items-center gap-2 text-left" aria-label="Fiona">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-10 rounded-xl" />
          <div>
            <div className="text-xl font-bold tracking-tight text-white">Fiona</div>
            <div className="text-xs text-slate-400">{t('tagline')}</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <AboutButton onClick={() => setAbout(true)} />
          <LangSwitch />
        </div>
      </header>

      <Card>
        <h2 className="text-lg font-semibold text-slate-200">{t('step1')}</h2>
        {m.freq === null && <p className="text-sm text-slate-400">{t('step1Hint')}</p>}

        {m.freq !== null && (
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-slate-400">{t('resonance')}</div>
            <div className="text-5xl font-bold tabular-nums text-cyan-300 my-1">
              {m.freq.toFixed(1)}
              <span className="text-2xl text-slate-400 ml-1">Hz</span>
            </div>
            {m.taps.length > 1 && <div className="text-xs text-slate-400">{t('tapsAveraged', { n: m.taps.length })}</div>}
            <div className="mt-3 flex items-center justify-center gap-2" aria-label={t('fineAdjust')}>
              {[-1, -0.1].map((d) => (
                <button key={d} onClick={() => nudge(d)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm tabular-nums text-slate-200 active:bg-slate-700">
                  {d}
                </button>
              ))}
              <span className="text-xs text-slate-500 px-1">Hz</span>
              {[0.1, 1].map((d) => (
                <button key={d} onClick={() => nudge(d)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm tabular-nums text-slate-200 active:bg-slate-700">
                  +{d}
                </button>
              ))}
            </div>
          </div>
        )}

        {m.spec && (
          <div className="space-y-1">
            <SpectrumChart spec={m.spec} peaks={m.peaks} selected={m.freq} onPick={m.pick} />
            <p className="text-xs text-slate-500">{t('tapToPick')}</p>
          </div>
        )}

        {listening ? (
          <div className="space-y-2">
            <div className="relative flex h-16 items-center justify-center rounded-2xl bg-pink-600/20 border border-pink-500/50 text-pink-200 font-semibold">
              <span className="absolute inset-0 rounded-2xl animate-ping bg-pink-500/10" />
              {t('listening')}
            </div>
            <LevelMeter label={t('micLevel')} />
            <button onClick={m.cancel} className="w-full rounded-xl py-2 text-sm text-slate-400">
              {t('cancel')}
            </button>
          </div>
        ) : m.freq === null ? (
          <button
            onClick={() => m.listen(false)}
            disabled={busy}
            className="w-full h-16 rounded-2xl bg-pink-600 text-lg font-semibold text-white active:scale-[0.98] transition disabled:opacity-40"
          >
            🎤 {t('listen')}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => m.listen(true)} disabled={busy} className="rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-100 disabled:opacity-40">
              ＋ {t('addTap')}
            </button>
            <button onClick={() => m.listen(false)} disabled={busy} className="rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-100 disabled:opacity-40">
              ↺ {t('remeasure')}
            </button>
          </div>
        )}

        {m.status.kind === 'error' && (
          <p className="rounded-xl bg-amber-950/50 border border-amber-800 p-3 text-sm text-amber-200">
            {t(m.status.key, { msg: m.status.msg ?? '' })}
          </p>
        )}
      </Card>

      {m.freq !== null && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-200">{t('step2')}</h2>

          <div>
            <label className="flex justify-between text-sm text-slate-300 mb-1">
              <span>{t('volume')}</span>
              <span className="tabular-nums">{Math.round(p.volume * 100)}%</span>
            </label>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={p.volume}
              onChange={(e) => p.setVolume(+e.target.value)}
              className="w-full accent-pink-500 h-8"
            />
            {p.volume >= LOUD_VOLUME && <p className="text-xs text-amber-300">⚠️ {t('volumeWarn')}</p>}
          </div>

          {!busy && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={p.play} className="rounded-2xl bg-cyan-600 py-4 font-semibold text-white active:scale-[0.98] transition">
                ▶ {t('play')}
              </button>
              <button onClick={p.tune} className="rounded-2xl bg-pink-600 py-4 font-semibold text-white active:scale-[0.98] transition">
                🎯 {t('tune')}
              </button>
            </div>
          )}
          {!busy && <p className="text-xs text-slate-400">{t('tuneHint')}</p>}

          {(p.mode === 'tuning' || p.tunedFreq !== null) && (
            <div className="space-y-2">
              <div className="text-sm text-slate-300">
                {p.mode === 'tuning'
                  ? t('tuning', { n: p.progress?.points.length ?? 0 })
                  : p.tunedFreq !== null && (
                      <span className="text-emerald-300">
                        ✓ {t(busy ? 'tunedPlaying' : 'tuned', { f: p.tunedFreq.toFixed(2) })}
                      </span>
                    )}
              </div>
              <SweepChart
                points={p.progress?.points ?? p.points}
                current={p.mode === 'tuning' ? p.progress?.point.freq : p.tunedFreq ?? undefined}
              />
              {p.mode !== 'tuning' && p.gainDb !== null && (
                <div className="text-sm text-emerald-300">{t('tunedGain', { db: p.gainDb.toFixed(1) })}</div>
              )}
            </div>
          )}

          {busy && <LevelMeter label={t('micLevel')} />}
          {p.autoStopped && (
            <p className="rounded-xl bg-amber-950/50 border border-amber-800 p-3 text-sm text-amber-200">
              {t('autoStopped', { s: 60 })}
            </p>
          )}
          {p.error && <p className="text-sm text-amber-300">{p.error}</p>}
          {isIOS && <p className="text-xs text-slate-500">{t('iosMute')}</p>}
        </Card>
      )}

      <History freq={m.freq} onUse={m.pick} />

      <footer className="pt-4 text-center text-xs text-slate-600">{t('footer')}</footer>

      {busy && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto">
            <button
              onClick={p.stop}
              className="w-full h-16 rounded-2xl bg-red-600 text-xl font-black tracking-widest text-white shadow-lg shadow-red-900/50 active:scale-[0.98] transition"
            >
              ■ {t('stop')}
            </button>
            <div className="mt-1 text-center text-xs text-slate-400 tabular-nums">
              {m.freq?.toFixed(2)} Hz · {t('timeLeft', { s: Math.max(0, p.secondsLeft) })}
            </div>
          </div>
        </div>
      )}

      {egg && <FionaEgg onClose={() => setEgg(false)} />}
      {about && <About onClose={closeAbout} />}
    </div>
  )
}
