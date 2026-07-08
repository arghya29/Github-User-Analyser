import { useEffect } from 'react'
import Link from 'next/link'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  username?: string
}

export default function MobileNav({ isOpen, onClose, username }: MobileNavProps) {
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-3">
          <Link
            href="/"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Home
          </Link>
          {username && (
            <Link
              href={`/${username}`}
              onClick={onClose}
              className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
            >
              @{username}
            </Link>
          )}
          <a
            href="https://github.com/arghya29/Github-User-Analyser"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
          >
            Source Code
          </a>
          <a
            href="https://github.com/arghya29/Github-User-Analyser/issues"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
          >
            Report Issue
          </a>
        </nav>
      </div>
    </div>
  )
}
