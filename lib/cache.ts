import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

// Initialize the Redis client. 
// This requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env file.
// We use a fallback to null so the app doesn't crash during local dev if env vars are missing.
const redis = env.UPSTASH_REDIS_REST_URL 
  ? Redis.fromEnv() 
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


export async function getCachedWithFallback<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
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
