import { useState, useId } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getLanguageColor } from '@/lib/languageColors'

interface LanguageChartProps {
  data: { name: string; value: number }[]
  mode?: 'bytes' | 'count'
}

// How many languages to show in the single legend row before the rest
// collapse behind a "see more" toggle. Kept low (4) because the chart sits in
// a half-width grid column on desktop and a narrow viewport on mobile, so more
// than ~4 language names cannot fit on one line without clipping.
const MAX_INLINE_LANGUAGES = 4

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, mode }: any) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  const suffix = mode === 'bytes' ? '% of code' : entry.value === 1 ? ' repo' : ' repos'
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white shadow-lg">
      <span className="font-semibold">{entry.name}</span>: {entry.value}
      {suffix}
    </div>
  )
}

function valueLabel(value: number, mode: 'bytes' | 'count'): string {
  if (mode === 'bytes') return `${value}%`
  return value === 1 ? '1 repo' : `${value} repos`
}

export default function LanguageChart({ data, mode = 'count' }: LanguageChartProps) {
  const [showAll, setShowAll] = useState(false)
  const panelId = useId()
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No language data available</p>
      </div>
    )
  }

  // Guarantee descending order by usage regardless of how the caller sorted it.
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const inline = sorted.slice(0, MAX_INLINE_LANGUAGES)
  const overflowCount = sorted.length - inline.length

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Language Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              stroke="none"
            >
              {sorted.map((entry) => (
                <Cell key={entry.name} fill={getLanguageColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip mode={mode} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Single-row legend (descending). Extra languages collapse behind "see more". */}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {inline.map((entry) => (
            <div
              key={entry.name}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap shrink-0"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: getLanguageColor(entry.name) }}
              />
              <span className="truncate">{entry.name}</span>
            </div>
          ))}
        </div>
        {overflowCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls={panelId}
            className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showAll ? 'See less' : `+${overflowCount} more`}
          </button>
        )}
      </div>

      {/* Expanded box listing every language, sorted descending. */}
      {showAll && overflowCount > 0 && (
        <div id={panelId} className="mt-3 border border-gray-200 dark:border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {sorted.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: getLanguageColor(entry.name) }}
                />
                <span className="font-medium text-gray-700 dark:text-gray-200">{entry.name}</span>
                <span className="text-gray-400 dark:text-gray-500">{valueLabel(entry.value, mode)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
