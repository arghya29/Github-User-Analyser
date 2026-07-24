import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

// Initialize the Redis client from validated env values. Gating on both the URL
// and the token means a half-configured setup (URL set, token missing) resolves
// to null here rather than failing at the first request.
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null

  try {
    return await redis.get<T>(key)
  } catch (error) {
    // FIXED: Separated the string from the variable to resolve the CodeQL alert
    console.error('Failed to fetch from Redis for key:', key, error)
    return null
  }
}

export async function setCached<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (!redis) return

  try {
    // 'px' tells Redis to expire the key after ttlMs (milliseconds)
    await redis.set(key, value, { px: ttlMs })
  } catch (error) {
    // FIXED: Separated the string from the variable to resolve the CodeQL alert
    console.error('Failed to set Redis cache for key:', key, error)
  }
}

/**
 * Delete a single key from the cache.
 *
 * Lets a write path (or a user-triggered "refresh") evict a stale entry
 * immediately instead of waiting for its TTL to elapse. A no-op when Redis is
 * not configured, mirroring the rest of this module.
 */
export async function invalidate(key: string): Promise<void> {
  if (!redis) return

  try {
    await redis.del(key)
  } catch (error) {
    console.error('Failed to invalidate Redis cache for key:', key, error)
  }
}

/**
 * Delete every key matching `${prefix}*` (e.g. all cached pages for one user).
 *
 * Uses SCAN rather than KEYS so a large keyspace isn't blocked in a single
 * command. Returns the number of keys deleted. A no-op returning 0 when Redis is
 * not configured.
 */
export async function invalidatePrefix(prefix: string): Promise<number> {
  if (!redis) return 0

  let deleted = 0
  try {
    let cursor = '0'
    do {
      const [next, keys] = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      })
      cursor = next
      if (keys.length > 0) {
        await redis.del(...keys)
        deleted += keys.length
      }
    } while (cursor !== '0')
  } catch (error) {
    console.error('Failed to invalidate Redis cache for prefix:', prefix, error)
  }
  return deleted
}

export async function getCachedWithFallback<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Try hitting the Redis cache first
  const cached = await getCached<T>(key)
  if (cached !== null) return cached

  // 2. Cache miss: fetch the fresh data from the source
  const fresh = await fetcher()

  // 3. Fire-and-forget the cache update in the background
  // We don't await this so it doesn't block returning the response to the user
  setCached(key, fresh, ttlMs)

  return fresh
}

/**
 * Stale-while-revalidate read.
 *
 * Serves a cached value instantly even after it is "stale", while refreshing it
 * in the background, so a user rarely waits on the source fetch. The value is
 * stored in an envelope carrying the write time; entries older than `staleMs`
 * are still returned but trigger a non-blocking refresh. Entries are physically
 * retained for `staleMs + revalidateMs` so a stale hit is possible in the first
 * place. Falls back to a plain blocking fetch when Redis is not configured.
 */
interface SwrEnvelope<T> {
  value: T
  storedAt: number
}

export async function getCachedSWR<T>(
  key: string,
  opts: { staleMs: number; revalidateMs?: number },
  fetcher: () => Promise<T>,
): Promise<T> {
  const revalidateMs = opts.revalidateMs ?? opts.staleMs
  const totalTtlMs = opts.staleMs + revalidateMs

  const store = async (value: T) => {
    const envelope: SwrEnvelope<T> = { value, storedAt: Date.now() }
    await setCached(key, envelope, totalTtlMs)
  }

  const envelope = await getCached<SwrEnvelope<T>>(key)

  // Cold miss (or Redis disabled): fetch synchronously and populate.
  if (!envelope || typeof envelope.storedAt !== 'number') {
    const fresh = await fetcher()
    store(fresh)
    return fresh
  }

  const isStale = Date.now() - envelope.storedAt > opts.staleMs
  if (isStale) {
    // Serve stale immediately, refresh behind it. Errors in the background
    // refresh must not surface to the caller who already has a usable value.
    void (async () => {
      try {
        store(await fetcher())
      } catch (error) {
        console.error('SWR background refresh failed for key:', key, error)
      }
    })()
  }

  return envelope.value
}
