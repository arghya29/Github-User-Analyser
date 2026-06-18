// Simple in-memory TTL cache for API route responses.
//
// Caveat: this lives in the Node.js process's memory, so it persists across
// requests as long as the *same* serverless instance stays warm, but it is
// not shared across instances and will reset on cold starts/redeploys. For
// local dev (`next dev`) and low-traffic deployments this still meaningfully
// cuts down on repeated GitHub API calls for the same username in a short
// window.

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}