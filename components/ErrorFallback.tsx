interface ErrorFallbackProps {
  error: Error
  reset: () => void
}

export default function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {error.message || 'Failed to load this section'}
          </p>
          <button
            onClick={reset}
            className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
