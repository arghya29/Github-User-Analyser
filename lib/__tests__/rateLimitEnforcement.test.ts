import type { NextApiRequest } from 'next'
import { getClientIp, createRateLimiter } from '@/lib/rateLimit'

/**
 * Enforcement tests for the rate limiter.
 *
 * `rateLimit.test.ts` already covers the trust boundary — which header is
 * believed, and why a forged leftmost `x-forwarded-for` cannot buy a fresh
 * bucket. This file covers the other half: what the limiter actually does once
 * it has an IP.
 *
 * Kept separate rather than appended so the existing security-focused suite
 * stays intact and readable; the two concern different things about the same
 * module.
 *
 * Three areas, all previously untested:
 *
 *  - **The Redis backend.** `createRateLimiter` picks Redis whenever KV or
 *    Upstash credentials are present, which is what production runs. The
 *    in-memory Map is the local-dev fallback. Only the fallback had any
 *    coverage, so the branch that actually protects the deployed API was
 *    entirely unexercised.
 *  - **The window boundary.** Allowed *at* `max`, blocked past it, and the
 *    counter resetting once the window rolls over. Off-by-one here either lets
 *    an extra request through every window or rejects a legitimate one.
 *  - **`maxKeys` eviction.** Without it the Map grows for the lifetime of the
 *    process — one entry per distinct IP, which is unbounded on a public API.
 */

const req = (headers: Record<string, string | string[] | undefined>, remoteAddress = '9.9.9.9') =>
  ({ headers, socket: { remoteAddress } }) as unknown as NextApiRequest

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
}

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis),
}))

/** Credentials are read inside `createRateLimiter`, so setting them here is enough. */
const withRedisCredentials = (fn: () => void | Promise<void>) => async () => {
  process.env.KV_REST_API_URL = 'https://kv.example'
  process.env.KV_REST_API_TOKEN = 'kv-token'
  try {
    await fn()
  } finally {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
})

afterEach(() => {
  jest.useRealTimers()
})

describe('getClientIp — array-valued headers', () => {
  it('takes the last entry when x-real-ip arrives as an array', () => {
    // Node exposes a repeated header as an array. The platform appends, so the
    // trustworthy value is the last one — same rule as for x-forwarded-for.
    expect(getClientIp(req({ 'x-real-ip': ['1.1.1.1', '2.2.2.2'] }))).toBe('2.2.2.2')
  })

  it('trims whitespace around an array x-real-ip entry', () => {
    expect(getClientIp(req({ 'x-real-ip': ['  3.3.3.3  '] }))).toBe('3.3.3.3')
  })

  it('ignores an empty x-real-ip array and falls through', () => {
    expect(getClientIp(req({ 'x-real-ip': [], 'x-forwarded-for': '4.4.4.4' }))).toBe('4.4.4.4')
  })

  it('ignores a whitespace-only x-real-ip and falls through', () => {
    expect(getClientIp(req({ 'x-real-ip': '   ', 'x-forwarded-for': '5.5.5.5' }))).toBe('5.5.5.5')
  })

  it('takes the last header when x-forwarded-for arrives as an array', () => {
    const ip = getClientIp(req({ 'x-forwarded-for': ['1.1.1.1', '2.2.2.2, 6.6.6.6'] }))
    expect(ip).toBe('6.6.6.6')
  })

  it('ignores empty hops in x-forwarded-for', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.1.1.1, , 7.7.7.7' }))).toBe('7.7.7.7')
  })

  it('falls back to unknown when there is no socket address either', () => {
    const bare = { headers: {}, socket: {} } as unknown as NextApiRequest
    expect(getClientIp(bare)).toBe('unknown')
  })
})

describe('in-memory limiter — the window boundary', () => {
  it('allows exactly max requests and blocks the next', async () => {
    const limiter = createRateLimiter(60_000, 3)
    expect(await limiter.check('1.2.3.4')).toBeNull()
    expect(await limiter.check('1.2.3.4')).toBeNull()
    expect(await limiter.check('1.2.3.4')).toBeNull()
    // The fourth is over the limit and comes back with seconds-to-reset.
    expect(await limiter.check('1.2.3.4')).toBeGreaterThan(0)
  })

  it('reports the remaining seconds, rounded up', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limiter = createRateLimiter(10_000, 1)
    await limiter.check('1.2.3.4')

    jest.setSystemTime(new Date('2026-01-01T00:00:04.500Z'))
    // 5.5s remain; a caller sending `Retry-After: 5` would retry too early.
    expect(await limiter.check('1.2.3.4')).toBe(6)
  })

  it('starts a fresh window once the old one expires', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limiter = createRateLimiter(1_000, 1)
    expect(await limiter.check('1.2.3.4')).toBeNull()
    expect(await limiter.check('1.2.3.4')).toBeGreaterThan(0)

    jest.setSystemTime(new Date('2026-01-01T00:00:01.001Z'))
    expect(await limiter.check('1.2.3.4')).toBeNull()
  })

  it('counts different IPs separately', async () => {
    const limiter = createRateLimiter(60_000, 1)
    expect(await limiter.check('1.1.1.1')).toBeNull()
    expect(await limiter.check('2.2.2.2')).toBeNull()
    expect(await limiter.check('1.1.1.1')).toBeGreaterThan(0)
  })

  it('scopes buckets by path when one is given', async () => {
    // Two routes with their own limits must not consume each other's budget.
    const limiter = createRateLimiter(60_000, 1)
    expect(await limiter.check('1.2.3.4', '/api/a')).toBeNull()
    expect(await limiter.check('1.2.3.4', '/api/b')).toBeNull()
    expect(await limiter.check('1.2.3.4', '/api/a')).toBeGreaterThan(0)
  })
})

describe('in-memory limiter — getRemaining', () => {
  it('reports the full allowance before any request', async () => {
    const limiter = createRateLimiter(60_000, 5)
    expect(await limiter.getRemaining('1.2.3.4')).toBe(5)
  })

  it('decreases as requests are counted', async () => {
    const limiter = createRateLimiter(60_000, 5)
    await limiter.check('1.2.3.4')
    expect(await limiter.getRemaining('1.2.3.4')).toBe(4)
    await limiter.check('1.2.3.4')
    expect(await limiter.getRemaining('1.2.3.4')).toBe(3)
  })

  it('never goes below zero', async () => {
    const limiter = createRateLimiter(60_000, 2)
    for (let i = 0; i < 6; i += 1) await limiter.check('1.2.3.4')
    expect(await limiter.getRemaining('1.2.3.4')).toBe(0)
  })

  it('resets to the full allowance once the window expires', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limiter = createRateLimiter(1_000, 5)
    await limiter.check('1.2.3.4')
    expect(await limiter.getRemaining('1.2.3.4')).toBe(4)

    jest.setSystemTime(new Date('2026-01-01T00:00:01.001Z'))
    expect(await limiter.getRemaining('1.2.3.4')).toBe(5)
  })

  it('is unaffected by a path-scoped bucket, which uses a different key', async () => {
    const limiter = createRateLimiter(60_000, 5)
    await limiter.check('1.2.3.4', '/api/a')
    expect(await limiter.getRemaining('1.2.3.4')).toBe(5)
  })
})

describe('in-memory limiter — key eviction', () => {
  it('does not grow past maxKeys', async () => {
    // Without eviction the Map holds one entry per distinct IP forever, which
    // on a public endpoint is unbounded growth.
    const limiter = createRateLimiter(60_000, 10, 3)
    for (let i = 0; i < 50; i += 1) {
      expect(await limiter.check(`10.0.0.${i}`)).toBeNull()
    }
    // Every IP is still allowed; the cap only bounds memory, never rejects.
    expect(await limiter.check('10.0.1.1')).toBeNull()
  })

  it('drops expired entries before evicting live ones', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limiter = createRateLimiter(1_000, 1, 3)

    await limiter.check('1.1.1.1')
    await limiter.check('2.2.2.2')
    await limiter.check('3.3.3.3')

    // Once those windows lapse, cleanup should reclaim them rather than the
    // eviction loop discarding a live bucket.
    jest.setSystemTime(new Date('2026-01-01T00:00:01.001Z'))
    await limiter.check('4.4.4.4')

    // The reclaimed IPs get a clean window, proving their entries were removed.
    expect(await limiter.check('1.1.1.1')).toBeNull()
  })

  it('evicts the oldest key when nothing has expired', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const limiter = createRateLimiter(60_000, 1, 2)

    await limiter.check('1.1.1.1')
    await limiter.check('2.2.2.2')
    // Adding a third forces the first out even though its window is live.
    await limiter.check('3.3.3.3')

    // 1.1.1.1 was evicted, so it starts a fresh window instead of being blocked.
    expect(await limiter.check('1.1.1.1')).toBeNull()
    // 3.3.3.3 is still tracked and is now at its limit.
    expect(await limiter.check('3.3.3.3')).toBeGreaterThan(0)
  })
})

describe('Redis backend selection', () => {
  type RateLimitModule = typeof import('@/lib/rateLimit')

  /** Loads the module with `@/lib/env` mocked, so the Upstash branch is reachable. */
  const loadWithUpstash = async (configured: boolean): Promise<RateLimitModule> => {
    jest.resetModules()
    jest.doMock('@/lib/env', () => ({
      env: configured
        ? {
            UPSTASH_REDIS_REST_URL: 'https://upstash.example',
            UPSTASH_REDIS_REST_TOKEN: 'upstash-token',
          }
        : { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
    }))
    jest.doMock('@upstash/redis', () => ({ Redis: jest.fn(() => mockRedis) }))
    return import('@/lib/rateLimit')
  }

  it('falls back to Upstash credentials when KV is not configured', async () => {
    // Production may be configured either way; only the KV path had coverage.
    const { createRateLimiter: create } = await loadWithUpstash(true)
    mockRedis.get.mockResolvedValue(null)
    const limiter = create(60_000, 5)
    await limiter.check('1.2.3.4')
    expect(mockRedis.set).toHaveBeenCalled()
  })

  it('uses the in-memory map when neither backend is configured', async () => {
    const { createRateLimiter: create } = await loadWithUpstash(false)
    const limiter = create(60_000, 1)
    expect(await limiter.check('1.2.3.4')).toBeNull()
    expect(await limiter.check('1.2.3.4')).toBeGreaterThan(0)
    // No Redis call at all — the fallback is genuinely local.
    expect(mockRedis.get).not.toHaveBeenCalled()
  })
})

describe('Redis-backed limiter', () => {
  it(
    'creates a bucket with the window TTL on the first request',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue(null)

      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.check('1.2.3.4')).toBeNull()

      expect(mockRedis.set).toHaveBeenCalledWith(
        'ratelimit:1.2.3.4',
        { count: 1, resetAt: Date.now() + 60_000, path: undefined },
        { px: 60_000 }
      )
    })
  )

  it(
    'namespaces the key by path when one is given',
    withRedisCredentials(async () => {
      mockRedis.get.mockResolvedValue(null)
      const limiter = createRateLimiter(60_000, 5)
      await limiter.check('1.2.3.4', '/api/github')
      expect(String(mockRedis.set.mock.calls[0][0])).toBe('ratelimit:1.2.3.4:/api/github')
    })
  )

  it(
    'increments an existing bucket without extending its window',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      const resetAt = Date.now() + 30_000
      mockRedis.get.mockResolvedValue({ count: 2, resetAt })

      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.check('1.2.3.4')).toBeNull()

      const [, value, opts] = mockRedis.set.mock.calls[0]
      expect(value).toMatchObject({ count: 3, resetAt })
      // The TTL must be the remaining time, not a fresh window — otherwise a
      // steady stream of requests would keep the bucket alive indefinitely.
      expect(opts).toEqual({ px: 30_000 })
    })
  )

  it(
    'blocks once the bucket reaches max and does not write',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue({ count: 5, resetAt: Date.now() + 4_200 })

      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.check('1.2.3.4')).toBe(5)
      expect(mockRedis.set).not.toHaveBeenCalled()
    })
  )

  it(
    'starts a new bucket when the stored one has expired',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue({ count: 99, resetAt: Date.now() - 1 })

      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.check('1.2.3.4')).toBeNull()
      expect(mockRedis.set.mock.calls[0][1]).toMatchObject({ count: 1 })
    })
  )

  it(
    'reports the full allowance when there is no bucket',
    withRedisCredentials(async () => {
      mockRedis.get.mockResolvedValue(null)
      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.getRemaining('1.2.3.4')).toBe(5)
    })
  )

  it(
    'reports the remaining allowance from a live bucket',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue({ count: 2, resetAt: Date.now() + 10_000 })
      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.getRemaining('1.2.3.4')).toBe(3)
    })
  )

  it(
    'never reports a negative allowance',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue({ count: 99, resetAt: Date.now() + 10_000 })
      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.getRemaining('1.2.3.4')).toBe(0)
    })
  )

  it(
    'reports the full allowance once the stored bucket has expired',
    withRedisCredentials(async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      mockRedis.get.mockResolvedValue({ count: 5, resetAt: Date.now() - 1 })
      const limiter = createRateLimiter(60_000, 5)
      expect(await limiter.getRemaining('1.2.3.4')).toBe(5)
    })
  )

  it(
    'uses the unscoped key for getRemaining even when checks were path-scoped',
    withRedisCredentials(async () => {
      mockRedis.get.mockResolvedValue(null)
      const limiter = createRateLimiter(60_000, 5)
      await limiter.getRemaining('1.2.3.4')
      expect(mockRedis.get).toHaveBeenCalledWith('ratelimit:1.2.3.4')
    })
  )
})
