import { useId } from 'react'
import { DEFAULT_PEAK_OPTIONS, type PeakOptions } from '../audio/peaks'
import { PEAK_LIMITS } from '../state/peakSettings'
import { useI18n, type Key } from '../i18n'

type Field = keyof PeakOptions

const pct = (v: number) => `${+(v * 100).toFixed(1)}%`
const FIELDS: { key: Field; label: Key; hint: Key; fmt: (v: number) => string }[] = [
  { key: 'fMin', label: 'optFMin', hint: 'optFMinHint', fmt: (v) => `${v} Hz` },
  { key: 'fMax', label: 'optFMax', hint: 'optFMaxHint', fmt: (v) => `${v} Hz` },
  { key: 'count', label: 'optCount', hint: 'optCountHint', fmt: String },
  { key: 'separationRel', label: 'optSeparationRel', hint: 'optSeparationRelHint', fmt: (v) => `±${pct(v)}` },
  { key: 'separationHz', label: 'optSeparationHz', hint: 'optSeparationHzHint', fmt: (v) => `±${v} Hz` },
  { key: 'prominenceDb', label: 'optProminenceDb', hint: 'optProminenceDbHint', fmt: (v) => `${v} dB` },
  { key: 'neighbourhoodRel', label: 'optNeighbourhoodRel', hint: 'optNeighbourhoodRelHint', fmt: (v) => `±${pct(v)}` },
  { key: 'maxBelowTopDb', label: 'optMaxBelowTopDb', hint: 'optMaxBelowTopDbHint', fmt: (v) => `${v} dB` },
]

interface Props {
  options: PeakOptions
  onChange: (key: Field, value: number) => void
  onReset: () => void
  isDefault: boolean
}

export function PeakSettings({ options, onChange, onReset, isDefault }: Props) {
  const { t } = useI18n()
  const id = useId()

  return (
    <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{t('settings')}</h3>
        <p className="text-xs text-slate-500">{t('settingsHint')}</p>
      </div>

      {FIELDS.map(({ key, label, hint, fmt }) => {
        const { min, max, step } = PEAK_LIMITS[key]
        const changed = options[key] !== DEFAULT_PEAK_OPTIONS[key]
        return (
          <div key={key}>
            <label htmlFor={`${id}-${key}`} className="flex justify-between gap-2 text-sm text-slate-300">
              <span>{t(label)}</span>
              <span className={`tabular-nums ${changed ? 'text-pink-300' : 'text-slate-400'}`}>{fmt(options[key])}</span>
            </label>
            <input
              id={`${id}-${key}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={options[key]}
              onChange={(e) => onChange(key, +e.target.value)}
              className="w-full accent-pink-500 h-7"
            />
            <p className="text-xs text-slate-500">{t(hint)}</p>
          </div>
        )
      })}

      <button
        onClick={onReset}
        disabled={isDefault}
        className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-100 active:bg-slate-700 disabled:opacity-40"
      >
        ↺ {t('resetDefaults')}
      </button>
    </div>
  )
}
