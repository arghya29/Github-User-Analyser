/**
 * Tests for the Redis-backed cache helpers.
 *
 * `lib/cache.ts` builds its Redis client at module load from the validated env, so each test loads
 * the module through `loadCache()` with the env mocked to either a configured or an unconfigured
 * state. That is what makes the "Redis is not configured" branch — the one every deployment without
 * Upstash credentials actually runs — reachable from a test.
 */

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
}

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedis),
}))

type CacheModule = typeof import('@/lib/cache')

async function loadCache(configured: boolean): Promise<CacheModule> {
  jest.resetModules()
  jest.doMock('@/lib/env', () => ({
    env: configured
      ? {
          UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
          UPSTASH_REDIS_REST_TOKEN: 'token',
        }
      : { UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined },
  }))
  return import('@/lib/cache')
}

/** Let queued microtasks (the fire-and-forget writes) settle before asserting. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

let errorSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
})

describe('cache with Redis not configured', () => {
  it('getCached resolves to null without touching Redis', async () => {
    const { getCached } = await loadCache(false)
    await expect(getCached('k')).resolves.toBeNull()
    expect(mockRedis.get).not.toHaveBeenCalled()
  })

  it('setCached and invalidate are no-ops rather than throwing', async () => {
    const { setCached, invalidate } = await loadCache(false)
    await expect(setCached('k', { a: 1 }, 1000)).resolves.toBeUndefined()
    await expect(invalidate('k')).resolves.toBeUndefined()
    expect(mockRedis.set).not.toHaveBeenCalled()
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('invalidatePrefix reports zero deletions', async () => {
    const { invalidatePrefix } = await loadCache(false)
    await expect(invalidatePrefix('user:')).resolves.toBe(0)
    expect(mockRedis.scan).not.toHaveBeenCalled()
  })

  it('getCachedWithFallback still returns fresh data from the fetcher', async () => {
    const { getCachedWithFallback } = await loadCache(false)
    const fetcher = jest.fn().mockResolvedValue({ ok: true })
    await expect(getCachedWithFallback('k', 1000, fetcher)).resolves.toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('getCachedSWR falls back to a plain blocking fetch', async () => {
    const { getCachedSWR } = await loadCache(false)
    const fetcher = jest.fn().mockResolvedValue('fresh')
    await expect(getCachedSWR('k', { staleMs: 1000 }, fetcher)).resolves.toBe('fresh')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('getCached / setCached', () => {
  it('returns the cached value on a hit', async () => {
    const { getCached } = await loadCache(true)
    mockRedis.get.mockResolvedValue({ hello: 'world' })
    await expect(getCached('k')).resolves.toEqual({ hello: 'world' })
    expect(mockRedis.get).toHaveBeenCalledWith('k')
  })

  it('a Redis read failure degrades to a miss instead of propagating', async () => {
    const { getCached } = await loadCache(true)
    mockRedis.get.mockRejectedValue(new Error('connection reset'))
    await expect(getCached('k')).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('setCached passes the TTL through as a millisecond expiry', async () => {
    const { setCached } = await loadCache(true)
    mockRedis.set.mockResolvedValue('OK')
    await setCached('k', { a: 1 }, 4500)
    expect(mockRedis.set).toHaveBeenCalledWith('k', { a: 1 }, { px: 4500 })
  })

  it('a Redis write failure is swallowed so the caller still succeeds', async () => {
    const { setCached } = await loadCache(true)
    mockRedis.set.mockRejectedValue(new Error('write failed'))
    await expect(setCached('k', 1, 1000)).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('invalidate / invalidatePrefix', () => {
  it('invalidate deletes the single key', async () => {
    const { invalidate } = await loadCache(true)
    mockRedis.del.mockResolvedValue(1)
    await invalidate('user:alice')
    expect(mockRedis.del).toHaveBeenCalledWith('user:alice')
  })

  it('invalidate swallows a delete failure', async () => {
    const { invalidate } = await loadCache(true)
    mockRedis.del.mockRejectedValue(new Error('nope'))
    await expect(invalidate('k')).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('invalidatePrefix scans and deletes matching keys', async () => {
    const { invalidatePrefix } = await loadCache(true)
    mockRedis.scan.mockResolvedValueOnce(['0', ['user:a', 'user:b']])
    mockRedis.del.mockResolvedValue(2)

    await expect(invalidatePrefix('user:')).resolves.toBe(2)
    expect(mockRedis.scan).toHaveBeenCalledWith('0', { match: 'user:*', count: 100 })
    expect(mockRedis.del).toHaveBeenCalledWith('user:a', 'user:b')
  })

  it('follows the cursor across pages until it wraps back to 0', async () => {
    const { invalidatePrefix } = await loadCache(true)
    mockRedis.scan
      .mockResolvedValueOnce(['17', ['user:a']])
      .mockResolvedValueOnce(['0', ['user:b', 'user:c']])
    mockRedis.del.mockResolvedValue(1)

    await expect(invalidatePrefix('user:')).resolves.toBe(3)
    expect(mockRedis.scan).toHaveBeenCalledTimes(2)
  })

  it('does not issue a delete for an empty page', async () => {
    const { invalidatePrefix } = await loadCache(true)
    mockRedis.scan.mockResolvedValueOnce(['0', []])

    await expect(invalidatePrefix('user:')).resolves.toBe(0)
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('returns the count deleted so far when a scan fails midway', async () => {
    const { invalidatePrefix } = await loadCache(true)
    mockRedis.scan
      .mockResolvedValueOnce(['9', ['user:a']])
      .mockRejectedValueOnce(new Error('scan blew up'))
    mockRedis.del.mockResolvedValue(1)

    await expect(invalidatePrefix('user:')).resolves.toBe(1)
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('getCachedWithFallback', () => {
  it('serves a cache hit without calling the fetcher', async () => {
    const { getCachedWithFallback } = await loadCache(true)
    mockRedis.get.mockResolvedValue({ cached: true })
    const fetcher = jest.fn()

    await expect(getCachedWithFallback('k', 1000, fetcher)).resolves.toEqual({ cached: true })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('on a miss it fetches and populates the cache', async () => {
    const { getCachedWithFallback } = await loadCache(true)
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue({ fresh: true })

    await expect(getCachedWithFallback('k', 2500, fetcher)).resolves.toEqual({ fresh: true })
    await flush()
    expect(mockRedis.set).toHaveBeenCalledWith('k', { fresh: true }, { px: 2500 })
  })

  it('a failing cache write does not stop fresh data being returned', async () => {
    const { getCachedWithFallback } = await loadCache(true)
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockRejectedValue(new Error('write failed'))
    const fetcher = jest.fn().mockResolvedValue('fresh')

    await expect(getCachedWithFallback('k', 1000, fetcher)).resolves.toBe('fresh')
    await flush()
  })
})

describe('getCachedSWR', () => {
  it('fetches synchronously on a cold miss and stores an envelope', async () => {
    const { getCachedSWR } = await loadCache(true)
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue('fresh')

    await expect(getCachedSWR('k', { staleMs: 1000 }, fetcher)).resolves.toBe('fresh')
    await flush()
    const [, storedValue, opts] = mockRedis.set.mock.calls[0]
    expect(storedValue).toMatchObject({ value: 'fresh' })
    expect(typeof (storedValue as { storedAt: number }).storedAt).toBe('number')
    // Retained for staleMs + revalidateMs so a stale hit is possible at all.
    expect(opts).toEqual({ px: 2000 })
  })

  it('honours an explicit revalidateMs in the retention window', async () => {
    const { getCachedSWR } = await loadCache(true)
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')

    await getCachedSWR('k', { staleMs: 1000, revalidateMs: 5000 }, async () => 'fresh')
    await flush()
    expect(mockRedis.set.mock.calls[0][2]).toEqual({ px: 6000 })
  })

  it('serves a fresh envelope without revalidating', async () => {
    const { getCachedSWR } = await loadCache(true)
    mockRedis.get.mockResolvedValue({ value: 'cached', storedAt: Date.now() })
    const fetcher = jest.fn()

    await expect(getCachedSWR('k', { staleMs: 60_000 }, fetcher)).resolves.toBe('cached')
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('serves a stale envelope immediately and refreshes behind it', async () => {
    const { getCachedSWR } = await loadCache(true)
    mockRedis.get.mockResolvedValue({ value: 'stale', storedAt: Date.now() - 10_000 })
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue('refreshed')

    // The caller gets the stale value straight away...
    await expect(getCachedSWR('k', { staleMs: 1000 }, fetcher)).resolves.toBe('stale')
    // ...and the refresh happens without them waiting on it.
    await flush()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(mockRedis.set).toHaveBeenCalled()
  })

  it('a failing background refresh never surfaces to the caller', async () => {
    const { getCachedSWR } = await loadCache(true)
    mockRedis.get.mockResolvedValue({ value: 'stale', storedAt: Date.now() - 10_000 })
    const fetcher = jest.fn().mockRejectedValue(new Error('upstream down'))

    await expect(getCachedSWR('k', { staleMs: 1000 }, fetcher)).resolves.toBe('stale')
    await flush()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('treats a value stored in the pre-envelope format as a cold miss', async () => {
    const { getCachedSWR } = await loadCache(true)
    // An entry written before SWR existed is the bare value, with no storedAt.
    mockRedis.get.mockResolvedValue({ legacy: true })
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue('fresh')

    await expect(getCachedSWR('k', { staleMs: 1000 }, fetcher)).resolves.toBe('fresh')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
