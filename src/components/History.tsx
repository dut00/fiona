import { useState } from 'react'
import { useI18n } from '../i18n'
import { loadHistory, saveHistory, type HistoryEntry } from '../state/history'

export function History({ freq, onUse }: { freq: number | null; onUse: (f: number) => void }) {
  const { t, lang } = useI18n()
  const [entries, setEntries] = useState<HistoryEntry[]>(loadHistory)
  const [name, setName] = useState('')

  const update = (next: HistoryEntry[]) => {
    setEntries(next)
    saveHistory(next)
  }

  const add = () => {
    if (freq === null) return
    update([
      { id: crypto.randomUUID?.() ?? String(Date.now()), name: name.trim() || `${freq.toFixed(1)} Hz`, freq, date: Date.now() },
      ...entries,
    ])
    setName('')
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-200">{t('history')}</h2>
      {freq !== null && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={60}
            className="min-w-0 flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500"
          />
          <button className="rounded-xl bg-slate-800 px-4 font-medium text-slate-100 active:bg-slate-700">{t('save')}</button>
        </form>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">{t('historyEmpty')}</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/50">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-100">{e.name}</div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {e.freq.toFixed(2)} Hz · {new Date(e.date).toLocaleDateString(lang)}
                </div>
              </div>
              <button onClick={() => onUse(e.freq)} className="rounded-lg bg-cyan-900/60 px-3 py-1.5 text-sm text-cyan-100">
                {t('use')}
              </button>
              <button
                onClick={() => update(entries.filter((x) => x.id !== e.id))}
                className="rounded-lg px-2 py-1.5 text-sm text-slate-400"
                aria-label={t('delete')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
