import { useEffect } from 'react'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const body = document.body
    if (!body) return

    if (!isOpen) {
      body.style.overflow = ''
      return
    }
    body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey)
      return () => {
        body.style.overflow = ''
        window.removeEventListener('keydown', handleKey)
      }
    }
    return () => {
      body.style.overflow = ''
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
      <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-slate-800 shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-3">
          <a
            href="#profile"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Profile
          </a>
          <a
            href="#activity"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Activity
          </a>
          <a
            href="#techstack"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Techstack
          </a>
          <a
            href="#repo-health"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Repo Health
          </a>
          <a
            href="#repositories"
            onClick={onClose}
            className="block px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            Repositories
          </a>
        </nav>
      </div>
    </div>
  )
}
