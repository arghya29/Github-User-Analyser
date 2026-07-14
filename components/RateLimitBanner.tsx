import { useEffect, useState } from 'react'

interface RateLimitBannerProps {
  resetAt?: string
  onRetry?: () => void
}

export default function RateLimitBanner({ resetAt, onRetry }: RateLimitBannerProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!resetAt) return

    const resetTime = Date.parse(resetAt)
    if (Number.isNaN(resetTime)) {
      setTimeLeft('Quota reset time unavailable.')
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const diff = resetTime - now

      if (diff <= 0) {
        setTimeLeft('Quota Reset! Ready to retry.')
        return
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(`Resets in ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [resetAt])

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-slate-800 dark:to-slate-800/80 border border-amber-300 dark:border-amber-700/80 rounded-2xl shadow-md text-amber-900 dark:text-amber-200">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-2xl shrink-0">
            ⏳
          </div>
          <div>
            <h4 className="font-bold text-lg text-amber-950 dark:text-amber-100">
              API Quota Limit Exhausted
            </h4>
            <p className="text-sm opacity-90 leading-relaxed mt-1">
              GitHub restricts anonymous API requests. To prevent this, configure a <code className="bg-amber-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs font-mono font-semibold">GITHUB_TOKEN</code> in your environment.
            </p>
            {resetAt && (
              <span className="inline-block mt-2 px-2.5 py-1 text-xs font-bold bg-amber-200/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 rounded-md">
                {timeLeft}
              </span>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 w-full sm:w-auto self-stretch sm:self-center shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 rounded-lg shadow-sm hover:shadow transition-all"
            >
              Retry Request
            </button>
          )}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold border border-amber-500/30 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            Create Token
          </a>
        </div>
      </div>
    </div>
  )
}
