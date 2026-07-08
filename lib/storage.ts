interface StoreEntry<T> {
  value: T
  expiresAt: number
}

const DB_NAME = 'gh-analyzer-cache'
const DB_VERSION = 1
const STORE_NAME = 'api-cache'

// IndexedDB is a browser-only API. This module is imported by the server-side
// cache tier (lib/cache.ts → pages/api/github.ts), where `indexedDB` is
// undefined (Node serverless runtime). Without this guard, every server-side
// cache miss calls `indexedDB.open` and throws `ReferenceError: indexedDB is
// not defined`, which the try/catch blocks below silently swallow on the hot
// path. Short-circuiting here keeps the persistence tier a clean no-op on the
// server (the in-memory tier still works) instead of throwing per miss.
function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function persistToIndexedDB<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (!isIndexedDbAvailable()) return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const entry: StoreEntry<T> = { value, expiresAt: Date.now() + ttlMs }
    store.put(entry, key)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB unavailable or quota exceeded — silently degrade
  }
}

export async function readFromIndexedDB<T>(key: string): Promise<T | null> {
  if (!isIndexedDbAvailable()) return null
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(key)
    const result = await new Promise<StoreEntry<T> | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()

    if (!result) return null
    if (Date.now() > result.expiresAt) {
      await removeFromIndexedDB(key)
      return null
    }
    return result.value
  } catch {
    return null
  }
}

async function removeFromIndexedDB(key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(key)
    tx.oncomplete = () => db.close()
  } catch {
    // ignore
  }
}

export async function clearIndexedDBCache(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => db.close()
  } catch {
    // ignore
  }
}
