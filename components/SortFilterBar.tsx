import { useState, useRef, useEffect } from 'react'
import type { SortOption } from '@/types/github'
import { getLanguageColor } from '@/lib/languageColors'

interface SortFilterBarProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  languages: { name: string; count: number }[]
  activeLanguages: string[]
  onLanguagesChange: (languages: string[]) => void
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
  activeLanguages,
  onLanguagesChange,
}: SortFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleLanguage = (name: string) => {
    const next = activeLanguages.includes(name)
      ? activeLanguages.filter((l) => l !== name)
      : [...activeLanguages, name]
    onLanguagesChange(next)
  }

  const getButtonLabel = () => {
    if (activeLanguages.length === 0) return 'Choose Techstack'
    if (activeLanguages.length === 1) return activeLanguages[0]
    if (activeLanguages.length === 2) return activeLanguages.join(', ')
    return `${activeLanguages.length} Techstacks`
  }

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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between gap-3 px-4 py-2 text-sm rounded-lg border transition-colors w-full sm:w-auto min-w-[200px] ${
              isOpen || activeLanguages.length > 0
                ? 'bg-white dark:bg-slate-700 border-blue-500 text-gray-900 dark:text-white shadow-sm ring-1 ring-blue-500'
                : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-slate-500'
            }`}
          >
            <span className="truncate">{getButtonLabel()}</span>
            <svg
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-2 max-h-72 overflow-y-auto">
              <div className="px-4 py-1 mb-1 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
                  Filter by Language
                </span>
                {activeLanguages.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onLanguagesChange([])
                    }}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>
              {languages.map(({ name, count }) => (
                <label
                  key={name}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={activeLanguages.includes(name)}
                    onChange={() => toggleLanguage(name)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: getLanguageColor(name) }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {name}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
