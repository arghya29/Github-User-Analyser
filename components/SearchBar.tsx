import { useState, useRef, useEffect, useId, useMemo } from 'react'
import { loadHistory } from '@/lib/searchHistory'
import { getFavorites } from '@/lib/favorites'

interface SearchBarProps {
  onSearch: (username: string) => void
  loading: boolean
}

const MAX_SUGGESTIONS = 8

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputId = useId()
  const listboxId = useId()
  const hasLoaded = useRef(false)

  // Build the suggestion pool once on mount: favorites first, then recent
  // history, de-duplicated case-insensitively. Reading localStorage here (not in
  // render) avoids an SSR hydration mismatch.
  useEffect(() => {
    const seen = new Set<string>()
    const merged: string[] = []
    for (const name of [...getFavorites(), ...loadHistory()]) {
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(name)
      }
    }
    setSuggestions(merged)
  }, [])

  // Keep the existing "refocus the input when a search finishes" behaviour.
  useEffect(() => {
    if (loading) {
      hasLoaded.current = true
    }
    if (hasLoaded.current && !loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase()
    const pool = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions
    return pool.slice(0, MAX_SUGGESTIONS)
  }, [input, suggestions])

  const showDropdown = isOpen && filtered.length > 0

  // Reset the keyboard highlight whenever the query changes.
  useEffect(() => {
    setActiveIndex(-1)
  }, [input])

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return

    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      if (typeof document.removeEventListener === 'function') {
        document.removeEventListener('mousedown', onClickOutside)
      }
    }
  }, [])

  const selectSuggestion = (username: string) => {
    setInput(username)
    setIsOpen(false)
    setActiveIndex(-1)
    onSearch(username)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsOpen(false)
    // Pass the input up unconditionally so the parent can trigger the validation error
    onSearch(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault()
        selectSuggestion(filtered[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto" role="search">
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={searchInputId} className="sr-only">
          GitHub Username
        </label>
        <div ref={containerRef} className="relative flex-1">
          <input
            id={searchInputId}
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter GitHub username..."
            aria-label="GitHub username"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 transition-shadow"
            disabled={loading}
          />
          {showDropdown && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Suggestions"
              className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto"
            >
              {filtered.map((s, i) => (
                <li
                  key={s}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    // Prevent the input blur that would close the list before the click lands.
                    e.preventDefault()
                    selectSuggestion(s)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-4 py-2 text-sm cursor-pointer ${
                    i === activeIndex
                      ? 'bg-blue-50 dark:bg-slate-700 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors active:scale-95 touch-manipulation focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  )
}
