import { useState, useEffect } from 'react'
import { setDeferredPrompt, triggerInstall, type BeforeInstallPromptEvent } from '@/lib/pwa'

export default function InstallPrompt() {
  const [deferredPrompt, setLocalPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setLocalPrompt(promptEvent)
      setDeferredPrompt(promptEvent)
      setShowPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    const outcome = await triggerInstall()
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setLocalPrompt(null)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Install App</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Add to your home screen for quick access</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setShowPrompt(false)}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
