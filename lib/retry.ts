/**
 * Retry helper for outbound GitHub requests.
 *
 * #243 gave each GitHub call a 10s timeout so a hung request can't stall the
 * invocation. This module adds the other half asked for in the roadmap: a single
 * transient 5xx, dropped socket, or secondary rate-limit response no longer
 * fails the whole request when a retry moments later would have succeeded.
 *
 * Two constraints shape the design:
 *
 * 1. **It has to compose with that 10s timeout, not fight it.** A timed-out
 *    attempt costs the full timeout, so three of them plus backoff is 30s+ —
 *    long enough to exceed a serverless invocation limit and turn a clean 504
 *    into a platform kill. Every retry is therefore gated on a wall-clock
 *    `budgetMs`: if the next attempt can't start within the budget, we stop and
 *    surface the real error immediately. Cheap failures (a 502 that returns in
 *    200ms) still get the full attempt count; expensive ones self-limit.
 *
 * 2. **GitHub overloads 403/429.** The same status covers permission-denied, the
 *    *secondary* rate limit (short, carries `retry-after`), and the *primary*
 *    rate limit (`x-ratelimit-remaining: 0`, whose `x-ratelimit-reset` can be an
 *    hour out). Waiting an hour is never right, and the caller already surfaces
 *    the primary limit to the UI. So we honor the headers to compute a wait, and
 *    let the budget reject any wait that isn't actually worth taking.
 */

export interface RetryInfo {
  /** 1-based index of the attempt that just failed. */
  attempt: number
  /** How long we're about to wait before the next attempt. */
  delayMs: number
  error: unknown
}

export interface RetryOptions {
  /** Total attempts including the first. Default 3 (i.e. up to 2 retries). */
  maxAttempts?: number
  /** First backoff step; doubles each attempt. Default 300ms. */
  baseDelayMs?: number
  /** Ceiling for a single backoff step. Default 2000ms. */
  maxDelayMs?: number
  /** Wall-clock ceiling for the whole call, including waits. Default 20000ms. */
  budgetMs?: number
  /** Called before each wait — used for logging. */
  onRetry?: (info: RetryInfo) => void
  /** Injectable for tests, so the suite doesn't spend real time asleep. */
  sleep?: (ms: number) => Promise<void>
  /** Injectable for tests, so jitter is deterministic. */
  random?: () => number
}

export const RETRY_DEFAULTS = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 2000,
  budgetMs: 20000,
} as const

/**
 * Transient transport-level failures. `ENOTFOUND` is deliberately absent: a DNS
 * name that doesn't resolve won't resolve on the next attempt either, so retrying
 * it just burns the budget. `EAI_AGAIN` (a *temporary* DNS failure) is included.
 */
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNABORTED', // axios timeout
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'ENETUNREACH',
  'ECONNREFUSED',
])

interface HttpErrorLike {
  code?: string
  response?: {
    status?: number
    headers?: Record<string, unknown>
  }
}

/** `Retry-After` is either delta-seconds or an HTTP-date. Both are legal. */
function parseRetryAfter(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null

  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

  const at = Date.parse(String(raw))
  if (Number.isFinite(at)) return Math.max(0, at - Date.now())

  return null
}

export interface Classification {
  retryable: boolean
  /** A wait mandated by the server, if it asked for one. Overrides backoff. */
  retryAfterMs: number | null
}

/**
 * Decides whether a failure is worth retrying, and whether the server dictated
 * how long to wait. Terminal statuses (400/401/404/422, and a plain 403) fail
 * fast — retrying a bad token or a missing user is pure latency.
 */
export function classifyError(error: unknown): Classification {
  const err = error as HttpErrorLike
  const status = err?.response?.status
  const headers = (err?.response?.headers ?? {}) as Record<string, unknown>

  // No HTTP response at all → transport failure.
  if (status === undefined) {
    return {
      retryable:
        err?.code !== undefined && RETRYABLE_NETWORK_CODES.has(err.code),
      retryAfterMs: null,
    }
  }

  // Server-side faults are the canonical retryable case.
  if (status >= 500 && status <= 599) {
    return {
      retryable: true,
      retryAfterMs: parseRetryAfter(headers['retry-after']),
    }
  }

  if (status === 429 || status === 403) {
    // Secondary rate limit / abuse detection: GitHub tells us exactly how long
    // to wait. Honor it — the budget check will reject it if it's too long.
    const retryAfterMs = parseRetryAfter(headers['retry-after'])
    if (retryAfterMs !== null) {
      return { retryable: true, retryAfterMs }
    }

    // Primary rate limit: quota is exhausted until `x-ratelimit-reset`. That can
    // be an hour away. Compute the real wait and let the budget decide — in
    // practice it declines, and the caller surfaces the rate-limit UI instead of
    // the user staring at a spinner.
    const remaining = Number(headers['x-ratelimit-remaining'])
    const reset = Number(headers['x-ratelimit-reset'])
    if (remaining === 0 && Number.isFinite(reset)) {
      const waitMs = reset * 1000 - Date.now()
      return { retryable: waitMs > 0, retryAfterMs: waitMs }
    }

    // A 429 with no guidance at all: back off normally.
    // A bare 403 is permission-denied, not throttling — terminal.
    return { retryable: status === 429, retryAfterMs: null }
  }

  // Every other 4xx (400, 401, 404, 422, ...) is the caller's fault. Fail fast.
  return { retryable: false, retryAfterMs: null }
}

/**
 * Equal jitter: half the window is fixed, half is random, so the delay always
 * lands in [exp/2, exp]. Full jitter can return ~0ms, which is the wrong thing to
 * do to an API that just throttled us; equal jitter still de-synchronizes
 * concurrent clients without ever hammering.
 */
function backoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
  return Math.round(exp / 2 + random() * (exp / 2))
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs `fn`, retrying transient failures with bounded, jittered backoff.
 * Rethrows the last error when the attempts, or the time budget, run out.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = RETRY_DEFAULTS.maxAttempts,
    baseDelayMs = RETRY_DEFAULTS.baseDelayMs,
    maxDelayMs = RETRY_DEFAULTS.maxDelayMs,
    budgetMs = RETRY_DEFAULTS.budgetMs,
    onRetry,
    sleep = defaultSleep,
    random = Math.random,
  } = options

  const startedAt = Date.now()
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt >= maxAttempts) break

      const { retryable, retryAfterMs } = classifyError(error)
      if (!retryable) break

      const delayMs =
        retryAfterMs !== null
          ? retryAfterMs
          : backoffDelayMs(attempt, baseDelayMs, maxDelayMs, random)

      // The budget is what keeps retries from fighting the per-request timeout:
      // if the next attempt can't even start inside it, stop now and surface the
      // real error rather than risking the invocation being killed mid-retry.
      if (Date.now() - startedAt + delayMs >= budgetMs) break

      onRetry?.({ attempt, delayMs, error })
      await sleep(delayMs)
    }
  }

  throw lastError
}
