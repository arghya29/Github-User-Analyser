export type ErrorType = 'not_found' | 'rate_limited' | 'network' | 'unknown'

interface ErrorStateProps {
  errorType: ErrorType
  message: string
  onRetry?: () => void
}

const errorConfig: Record<ErrorType, { icon: string; title: string }> = {
  not_found: { icon: '🔍', title: 'User Not Found' },
  network: { icon: '📡', title: 'Network Error' },
  rate_limited: { icon: '⏳', title: 'Rate Limit Reached' },
  unknown: { icon: '⚠️', title: 'Something Went Wrong' },
}

export default function ErrorState({ errorType, message, onRetry }: ErrorStateProps) {
  const { icon, title } = errorConfig[errorType] ?? errorConfig.unknown

  return (
    <div
      role="alert"
      className="max-w-2xl mx-auto mt-8 p-6 bg-gradient-to-br from-red-50 to-rose-100/50 dark:from-slate-800 dark:to-slate-800/80 border border-red-300 dark:border-red-700/80 rounded-2xl shadow-md text-red-900 dark:text-red-200"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <div
            className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-2xl shrink-0"
            aria-hidden="true"
          >
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-lg text-red-950 dark:text-red-100">{title}</h4>
            <p className="text-sm opacity-90 leading-relaxed mt-1">{message}</p>
          </div>
        </div>

        {onRetry && (
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto self-stretch sm:self-center shrink-0">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-lg shadow-sm hover:shadow transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
