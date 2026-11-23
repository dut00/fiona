import { useI18n, type Lang } from '../i18n'

export function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="inline-flex rounded-full bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
      {(['pl', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-3 py-1.5 rounded-full uppercase ${lang === l ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
