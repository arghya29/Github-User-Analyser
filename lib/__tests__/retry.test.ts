import { withRetry, classifyError, RETRY_DEFAULTS } from '@/lib/retry'

/** Builds an axios-shaped HTTP error. */
function httpError(status: number, headers: Record<string, unknown> = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status, headers } })
}

/** Builds an axios-shaped transport error (no HTTP response). */
function networkError(code: string) {
  return Object.assign(new Error(code), { code })
}

// Never sleep for real in tests; record what the delay *would* have been.
function fakeSleeper() {
  const delays: number[] = []
  return {
    delays,
    sleep: async (ms: number) => {
      delays.push(ms)
    },
  }
}

// Deterministic jitter: always take the top of the equal-jitter window.
const noJitter = () => 1

describe('classifyError', () => {
  it('retries transient transport failures', () => {
    for (const code of ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']) {
      expect(classifyError(networkError(code)).retryable).toBe(true)
    }
  })

  it('does not retry a DNS name that does not resolve', () => {
    // ENOTFOUND won't resolve on the next attempt either — retrying burns budget.
    expect(classifyError(networkError('ENOTFOUND')).retryable).toBe(false)
  })

  it('retries 5xx', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyError(httpError(status)).retryable).toBe(true)
    }
  })

  it('does not retry terminal 4xx (404, 401, 400, 422)', () => {
    for (const status of [400, 401, 404, 422]) {
      expect(classifyError(httpError(status)).retryable).toBe(false)
    }
  })

  it('honors Retry-After (delta-seconds) on a secondary rate limit', () => {
    const result = classifyError(httpError(429, { 'retry-after': '2' }))
    expect(result.retryable).toBe(true)
    expect(result.retryAfterMs).toBe(2000)
  })

  it('honors Retry-After on a 403 secondary rate limit', () => {
    const result = classifyError(httpError(403, { 'retry-after': '1' }))
    expect(result.retryable).toBe(true)
    expect(result.retryAfterMs).toBe(1000)
  })

  it('treats a bare 403 as permission-denied, not throttling', () => {
    expect(classifyError(httpError(403)).retryable).toBe(false)
  })

  it('computes the wait for a primary rate limit from x-ratelimit-reset', () => {
    const resetInFiveSeconds = Math.floor((Date.now() + 5000) / 1000)
    const result = classifyError(
      httpError(403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetInFiveSeconds),
      }),
    )
    expect(result.retryable).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(3000)
    expect(result.retryAfterMs).toBeLessThanOrEqual(5000)
  })

  it('does not retry an already-elapsed primary rate limit reset', () => {
    const resetInThePast = Math.floor((Date.now() - 1000) / 1000)
    const result = classifyError(
      httpError(429, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetInThePast),
      }),
    )
    expect(result.retryable).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    await expect(withRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries a transient failure and then succeeds', async () => {
    const { sleep, delays } = fakeSleeper()
    const fn = jest.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValue('recovered')

    await expect(withRetry(fn, { sleep, random: noJitter })).resolves.toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(delays).toHaveLength(1)
  })

  it('exhausts the attempt budget and rethrows the last error', async () => {
    const { sleep, delays } = fakeSleeper()
    const err = httpError(500)
    const fn = jest.fn().mockRejectedValue(err)

    await expect(withRetry(fn, { sleep, random: noJitter })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(RETRY_DEFAULTS.maxAttempts)
    // One fewer sleep than attempts — we never sleep after the final failure.
    expect(delays).toHaveLength(RETRY_DEFAULTS.maxAttempts - 1)
  })

  it('fails fast on 404 without retrying', async () => {
    const { sleep } = fakeSleeper()
    const err = httpError(404)
    const fn = jest.fn().mockRejectedValue(err)

    await expect(withRetry(fn, { sleep })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('fails fast on 401 without retrying', async () => {
    const { sleep } = fakeSleeper()
    const fn = jest.fn().mockRejectedValue(httpError(401))

    await expect(withRetry(fn, { sleep })).rejects.toBeDefined()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('applies bounded, increasing backoff capped at maxDelayMs', async () => {
    const { sleep, delays } = fakeSleeper()
    const fn = jest.fn().mockRejectedValue(httpError(500))

    await expect(
      withRetry(fn, {
        sleep,
        random: noJitter,
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 250,
      }),
    ).rejects.toBeDefined()

    // base=100 → 100, 200, then capped at 250 (not 400).
    expect(delays).toEqual([100, 200, 250])
    for (const d of delays) expect(d).toBeLessThanOrEqual(250)
  })

  it('keeps jitter inside the equal-jitter window [exp/2, exp]', async () => {
    const { sleep, delays } = fakeSleeper()
    const fn = jest.fn().mockRejectedValue(httpError(500))

    await expect(
      withRetry(fn, {
        sleep,
        random: () => 0, // bottom of the window
        maxAttempts: 2,
        baseDelayMs: 400,
      }),
    ).rejects.toBeDefined()

    // Even at random()=0 we still wait half the window — never ~0ms.
    expect(delays[0]).toBe(200)
  })

  it('uses the server-mandated Retry-After instead of computed backoff', async () => {
    const { sleep, delays } = fakeSleeper()
    const fn = jest
      .fn()
      .mockRejectedValueOnce(httpError(429, { 'retry-after': '2' }))
      .mockResolvedValue('ok')

    await expect(withRetry(fn, { sleep, random: noJitter })).resolves.toBe('ok')
    expect(delays).toEqual([2000])
  })

  it('refuses a retry that cannot start inside the time budget', async () => {
    // A primary rate limit resetting in an hour: retryable in principle, but
    // waiting is absurd — the budget must decline it and fail fast.
    const { sleep, delays } = fakeSleeper()
    const resetInAnHour = Math.floor((Date.now() + 3600_000) / 1000)
    const err = httpError(429, {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(resetInAnHour),
    })
    const fn = jest.fn().mockRejectedValue(err)

    await expect(withRetry(fn, { sleep })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toHaveLength(0)
  })

  it('declines a retry when the budget is already spent', async () => {
    const { sleep, delays } = fakeSleeper()
    const fn = jest.fn().mockRejectedValue(httpError(500))

    await expect(withRetry(fn, { sleep, budgetMs: 0 })).rejects.toBeDefined()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toHaveLength(0)
  })

  it('reports each retry through onRetry', async () => {
    const { sleep } = fakeSleeper()
    const onRetry = jest.fn()
    const fn = jest.fn().mockRejectedValueOnce(httpError(502)).mockResolvedValue('ok')

    await withRetry(fn, { sleep, random: noJitter, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry.mock.calls[0][0]).toMatchObject({ attempt: 1 })
    expect(onRetry.mock.calls[0][0].delayMs).toBeGreaterThan(0)
  })
})
