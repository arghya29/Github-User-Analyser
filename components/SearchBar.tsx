import { useState, useRef, useEffect, useId } from 'react'

interface SearchBarProps {
  onSearch: (username: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputId = useId()
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (loading) {
      hasLoaded.current = true
    }
    if (hasLoaded.current && !loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) {
      onSearch(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto" role="search">
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={searchInputId} className="sr-only">
          GitHub Username
        </label>
        <input
          id={searchInputId}
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter GitHub username..."
          aria-label="GitHub username"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 transition-shadow"
          disabled={loading}
        />
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
