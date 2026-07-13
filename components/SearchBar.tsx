import { useState, useRef, useEffect, useId, useMemo, useCallback } from 'react'
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

  // 🛠️ FIX: Extracted suggestion pool logic so it can be re-run after a search
  const loadSuggestions = useCallback(() => {
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

  // Build the suggestion pool once on mount
  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  // Refocus the input AND refresh history when a search finishes
  useEffect(() => {
    if (loading) {
      hasLoaded.current = true
    }
    if (hasLoaded.current && !loading) {
      if (inputRef.current) {
        inputRef.current.focus()
      }
      // 🛠️ FIX: Re-sync local storage history into the dropdown state
      loadSuggestions() 
    }
  }, [loading, loadSuggestions])

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
        document
