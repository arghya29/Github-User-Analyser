import type { RateLimitInfo } from '@/types/github'

interface RateLimitBadgeProps {
  rateLimit?: RateLimitInfo
}

/**
 * Subtle badge showing the remaining GitHub API quota (e.g. "API 4,873 / 5,000").
 * Turns amber/red when the remaining quota drops below ~10% of the limit, and
 * renders nothing when no rate-limit data is available (e.g. the value couldn't
 * be read) so it never leaves an empty gap.
 */
export default function RateLimitBadge({ rateLimit }: RateLimitBadgeProps) {
  if (
    !rateLimit ||
    typeof rateLimit.limit !== 'number' ||
    typeof rateLimit.remaining !== 'number' ||
    rateLimit.limit <= 0
  ) {
    return null
  }

  const { limit, remaining, resetAt } = rateLimit
  const low = remaining / limit < 0.1

  let resetText: string | undefined
  if (resetAt) {
    const reset = new Date(resetAt)
    if (!Number.isNaN(reset.getTime())) {
      resetText = reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const title = resetText
    ? `GitHub API requests remaining this hour — resets at ${resetText}`
    : 'GitHub API requests remaining this hour'

  return (
    <div
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        low
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${low ? 'bg-amber-500' : 'bg-green-500'}`}
        aria-hidden="true"
      />
      <span className="tabular-nums">
        API {remaining.toLocaleString()} / {limit.toLocaleString()}
      </span>
      {resetText && (
        <>
          {/* Announced to assistive tech at every breakpoint (the visible copy
              below is hidden under sm), so the reset time never lives in title alone. */}
          <span className="sr-only">, resets {resetText}</span>
          <span
            aria-hidden="true"
            className="text-gray-400 dark:text-gray-500 hidden sm:inline"
          >
            · resets {resetText}
          </span>
        </>
      )}
    </div>
  )
}
