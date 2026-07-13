import { useState, useEffect, useRef, useCallback, memo } from 'react'
import type { Repository } from '@/types/github'
import { getLanguageColorClass } from '@/lib/languageColors'
import RepoHealthAnalysisPanel from '@/components/RepoHealthAnalysisPanel'
import CommitActivityButton from '@/components/CommitActivityButton'
import StarHistoryButton from '@/components/StarHistoryButton'

interface RepositoryCardProps {
  repo: Repository
  /**
   * Receives the repo it was called for. Taking the repo as an argument (rather than
   * having each parent close over it in `() => onRepoClick(repo)`) is what lets callers
   * pass one stable handler reference down to every card — without that, the closure is
   * a new function on every render and `memo` below would never prevent a re-render.
   */
  onSelect: (repo: Repository) => void
}

function RepositoryCard({ repo, onSelect }: RepositoryCardProps) {
  const [showActionBox, setShowActionBox] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const lastUpdated = new Date(repo.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // 🛠️ FIX: Fallback to an empty string if language is null so the helper function doesn't crash
  const langColor = getLanguageColorClass(repo.language ?? '')

  const openModal = useCallback((trigger?: HTMLElement | null) => {
    previousFocusRef.current = trigger ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setShowActionBox(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowActionBox(false)
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (!showActionBox || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      if (e.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const firstBtn = dialogRef.current?.querySelector<HTMLElement>('button')
    firstBtn?.focus()

    return () => {
      if (typeof document.removeEventListener === 'function') {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [showActionBox, closeModal])

  return (
    <>
      <button
        type="button"
        className="w-full text-left bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer block"
        onClick={(e) => openModal(e.currentTarget)}
      >
        {/* Repo Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {repo.name}
        </h3>

        {/* 🛠️ FIX: Removed the `&&` check and added a null-coalescing fallback string */}
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {repo.description ?? 'No description provided.'}
        </p>

        {/* 🛠️ FIX: Removed the
