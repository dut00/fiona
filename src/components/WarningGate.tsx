import { useState } from 'react'
import { useI18n } from '../i18n'
import { LangSwitch } from './LangSwitch'

export function WarningGate({ onAccept }: { onAccept: () => void }) {
  const { t } = useI18n()
  const [checked, setChecked] = useState(false)

  const items: [string, string][] = [
    ['👂', t('warnHearing')],
    ['🥽', t('warnShards')],
    ['🐕', t('warnOthers')],
    ['🏺', t('warnProperty')],
  ]

  return (
    <div className="min-h-dvh flex flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] max-w-lg mx-auto">
      <div className="flex justify-end">
        <LangSwitch />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-5 py-6">
        <div className="text-center">
          <div className="text-5xl mb-2" aria-hidden>⚠️</div>
          <h1 className="text-2xl font-bold text-amber-300">{t('warnTitle')}</h1>
        </div>
        <p className="text-slate-300">{t('warnIntro')}</p>
        <ul className="space-y-3">
          {items.map(([icon, text]) => (
            <li key={icon} className="flex gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3 text-sm text-slate-200">
              <span className="text-xl shrink-0" aria-hidden>{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-cyan-200/90 rounded-xl border border-cyan-900 bg-cyan-950/40 p-3">{t('warnReality')}</p>
        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-pink-500 shrink-0"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="text-slate-100">{t('warnCheckbox')}</span>
        </label>
      </div>
      <button
        disabled={!checked}
        onClick={onAccept}
        className="w-full rounded-2xl py-4 text-lg font-semibold bg-pink-600 text-white disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98] transition"
      >
        {t('warnContinue')}
      </button>
    </div>
  )
}
