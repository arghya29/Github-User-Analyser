import { useState, useRef, useEffect } from 'react'
import type { SortOption } from '@/types/github'
import { getLanguageColor } from '@/lib/languageColors'

interface SortFilterBarProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  languages: { name: string; count: number }[]
  activeLanguages: string[]
  onLanguagesChange: (languages: string[]) => void
  repoQuery: string
  onRepoQueryChange: (query: string) => void
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
  repoQuery,
  onRepoQueryChange,
}: SortFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
          <label htmlFor="repo-search" className="sr-only">Search repositories by name</label>
          <div className="relative w-full sm:w-auto">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              id="repo-search"
              type="search"
              value={repoQuery}
              onChange={(e) => onRepoQueryChange(e.target.value)}
              placeholder="Search repositories…"
              aria-label="Search repositories by name"
              className="w-full sm:w-56 pl-9 pr-9 py-2.5 sm:py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&::-webkit-search-cancel-button]:appearance-none"
            />
            {repoQuery && (
              <button
                type="button"
                onClick={() => onRepoQueryChange('')}
                aria-label="Clear repository search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
          <label htmlFor="sort-select" className="sr-only">Sort repositories</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-4 py-2.5 sm:py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                Sort: {label}
              </option>
            ))}
          </select>
        </div>

        {languages.length > 0 && (
          <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              aria-expanded={isOpen}
              aria-label="Filter by Language"
              aria-describedby="language-filter-value"
              aria-controls="language-filter-popup"
              className={`flex items-center justify-between gap-3 px-4 py-2.5 sm:py-2 text-sm rounded-lg border transition-all w-full sm:w-auto min-w-[200px] ${
                isOpen || activeLanguages.length > 0
                  ? 'bg-white dark:bg-slate-700 border-blue-500 text-gray-900 dark:text-white shadow-sm ring-1 ring-blue-500'
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-slate-500'
              }`}
            >
              <span
                id="language-filter-value"
                className="truncate font-medium"
              >
                {getButtonLabel()}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <fieldset
                  id="language-filter-popup"
                  className="absolute left-0 mt-2 w-full sm:w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-2 max-h-72 overflow-y-auto"
                >
                <legend className="px-4 py-1.5 mb-1 border-b border-gray-100 dark:border-slate-700 w-full">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">
                    Filter by Language
                  </span>
                </legend>
                <div className="flex flex-col">
                  {languages.map(({ name, count }) => (
                    <label
                      key={name}
                      className="flex items-center gap-3 px-4 py-2.5 sm:py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
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
                          aria-hidden="true"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
                        {count}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}
      </div>

      {activeLanguages.length > 0 && (
        <button
          onClick={() => onLanguagesChange([])}
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg transition-all w-full sm:w-auto mt-2 sm:mt-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear Filters
        </button>
      )}
    </div>
  )
}
