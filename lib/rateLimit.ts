import type { NextApiRequest } from 'next'
import { kv } from '@vercel/kv'

interface RateWindow {
  count: number
  resetAt: number
  path?: string
}

export function getClientIp(req: NextApiRequest): string {
  // Trust boundary: on the deployment platform (Vercel) the client's real IP is
  // exposed via `x-real-ip` (which the platform sets and the client cannot
  // forge) and is appended as the RIGHTMOST entry of `x-forwarded-for`. The
  // LEFTMOST `x-forwarded-for` entry is attacker-controlled — a client can send
  // a rotating/forged header to get a fresh rate-limit bucket per request — so
  // it must NOT be used for rate limiting. Prefer `x-real-ip`; otherwise take
  // the rightmost forwarded hop; finally fall back to the socket address.
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim()
  }
  if (Array.isArray(realIp) && realIp.length > 0) {
    return realIp[realIp.length - 1].trim()
  }

  const forwarded = req.headers['x-forwarded-for']
  const forwardedValue = Array.isArray(forwarded)
    ? forwarded[forwarded.length - 1]
    : forwarded
  if (typeof forwardedValue === 'string' && forwardedValue.length > 0) {
    const hops = forwardedValue
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return req.socket.remoteAddress || 'unknown'
}

export interface RateLimiter {
  // 🛠️ FIX: Upgraded to Promises so we can use external databases (Redis/KV)
  check(ip: string, path?: string): Promise<number | null>
  getRemaining(ip: string): Promise<number>
}

export function createRateLimiter(windowMs: number, max: number, maxKeys = 5000): RateLimiter {
  // Check if Vercel KV environment variables are present
  const useKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

  if (useKV) {
    // 🌍 PRODUCTION: Use Vercel KV (Redis)
    return {
      async check(ip: string, path?: string): Promise<number | null> {
        const key = path ? `ratelimit:${ip}:${path}` : `ratelimit:${ip}`
        const now = Date.now()
        
        const bucket = await kv.get<RateWindow>(key)

        if (bucket && now < bucket.resetAt) {
          if (bucket.count >= max) {
            return Math.ceil((bucket.resetAt - now) / 1000)
          }
          bucket.count += 1
          // Update the count and preserve the original expiration time
          await kv.set(key, bucket, { px: bucket.resetAt - now })
          return null
        }

        // Create a new rate limit bucket
        await kv.set(key, { count: 1, resetAt: now + windowMs, path }, { px: windowMs })
        return null
      },

      async getRemaining(ip: string): Promise<number> {
        const key = `ratelimit:${ip}`
        const bucket = await kv.get<RateWindow>(key)
        const now = Date.now()
        if (!bucket || now >= bucket.resetAt) return max
        return Math.max(0, max - bucket.count)
      },
    }
  }

  // 💻 LOCAL DEV: Fallback to the original in-memory Map
  const buckets = new Map<string, RateWindow>()

  function cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(key)
    }
  }

  return {
    async check(ip: string, path?: string): Promise<number | null> {
      const now = Date.now()
      const key = path ? `${ip}:${path}` : ip
      const bucket = buckets.get(key)

      if (bucket && now < bucket.resetAt) {
        if (bucket.count >= max) {
          return Math.ceil((bucket.resetAt - now) / 1000)
        }
        bucket.count += 1
        return null
      }

      if (buckets.size >= maxKeys) {
        cleanup()
        while (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value
          if (oldest === undefined) break
          buckets.delete(oldest)
        }
      }

      buckets.set(key, { count: 1, resetAt: now + windowMs, path })
      return null
    },

    async getRemaining(ip: string): Promise<number> {
      const now = Date.now()
      const bucket = buckets.get(ip)
      if (!bucket || now >= bucket.resetAt) return max
      return Math.max(0, max - bucket.count)
    },
  }
}
