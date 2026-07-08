import { persistToIndexedDB, readFromIndexedDB } from './storage'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

const MAX_ENTRIES = 500

function pruneExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key)
  }
}

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
  pruneExpired()
  if (!store.has(key)) {
    while (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value
      if (oldest === undefined) break
      store.delete(oldest)
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export async function getCachedWithFallback<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const memCached = getCached<T>(key)
  if (memCached) return memCached

  const diskCached = await readFromIndexedDB<T>(key)
  if (diskCached) {
    setCached(key, diskCached, ttlMs)
    return diskCached
  }

  const fresh = await fetcher()
  setCached(key, fresh, ttlMs)
  try {
    await persistToIndexedDB(key, fresh, ttlMs)
  } catch {
  }

  return fresh
}

export function getCacheStats(): { size: number; maxEntries: number } {
  return { size: store.size, maxEntries: MAX_ENTRIES }
}
