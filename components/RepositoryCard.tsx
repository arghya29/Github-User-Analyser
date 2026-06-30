import { useState, useEffect, useRef, useCallback } from 'react'
import type { Repository } from '@/types/github'
import { getLanguageColorClass } from '@/lib/languageColors'
import HealthScoreBadge from '@/components/HealthScoreBadge'

interface RepositoryCardProps {
  repo: Repository
  onClick: () => void
}

export default function RepositoryCard({ repo, onClick }: RepositoryCardProps) {
  const [showActionBox, setShowActionBox] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const lastUpdated = new Date(repo.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const langColor = getLanguageColorClass(repo.language)

  const openModal = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    setShowActionBox(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowActionBox(false)
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (!showActionBox) return

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

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showActionBox, closeModal])

  return (
    <>
      <div
        className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
        onClick={openModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
            e.preventDefault()
            openModal()
          }
        }}
      >
        {/* Repo Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {repo.name}
        </h3>

        {/* Description */}
        {repo.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
            {repo.description}
          </p>
        )}

        {/* Language */}
        {repo.language && (
          <div className="mb-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${langColor}`}></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{repo.language}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {repo.stargazers_count}
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 2a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H6zm0 2h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
            </svg>
            {repo.forks_count}
          </div>
          {typeof repo.watchers_count === 'number' && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
              </svg>
              {repo.watchers_count}
            </div>
          )}
          {typeof repo.open_issues_count === 'number' && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
              {repo.open_issues_count}
            </div>
          )}
          <div className="ml-auto text-xs">Updated {lastUpdated}</div>
        </div>
      </div>

      {/* Action box modal */}
      {showActionBox && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`repo-dialog-${repo.name.replace(/[^a-zA-Z0-9-]/g, '-')}`}
        >
          <div
            ref={dialogRef}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={`repo-dialog-${repo.name.replace(/[^a-zA-Z0-9-]/g, '-')}`}
              className="text-lg font-bold text-gray-900 dark:text-white mb-1"
            >
              {repo.name}
            </h3>
            {repo.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2">
                {repo.description}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { closeModal(); onClick() }}
                className="w-full text-sm font-medium px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                📖 Preview README
              </button>

              <div className="w-full">
                <HealthScoreBadge repo={repo} />
              </div>

              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-sm font-medium px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-center block"
              >
                🔗 View on GitHub
              </a>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="mt-4 w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
