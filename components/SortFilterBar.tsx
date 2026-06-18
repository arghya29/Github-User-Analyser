import type { SortOption } from '@/types/github'
import { getLanguageColor } from '@/lib/languageColors'

interface SortFilterBarProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  languages: { name: string; count: number }[]
  activeLanguage: string | null
  onLanguageChange: (language: string | null) => void
}

const SORT_LABELS: Record<SortOption, string> = {
  stars: 'Most Stars',
  updated: 'Recently Updated',
  forks: 'Most Forks',
}

export default function SortFilterBar({
  sortBy,
  onSortChange,
  languages,
  activeLanguage,
  onLanguageChange,
}: SortFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            Sort: {label}
          </option>
        ))}
      </select>

      {languages.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onLanguageChange(null)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              activeLanguage === null
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-blue-500'
            }`}
          >
            All
          </button>
          {languages.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => onLanguageChange(name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                activeLanguage === name
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-blue-500'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: getLanguageColor(name) }}
              />
              {name} ({count})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}