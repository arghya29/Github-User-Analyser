import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import {
  persistToIndexedDB,
  readFromIndexedDB,
  clearIndexedDBCache,
} from '@/lib/storage'

/**
 * Tests for the IndexedDB response cache.
 *
 * IndexedDB is a browser API and Jest runs this project in a Node environment,
 * so `indexedDB` is undefined by default. `fake-indexeddb/auto` supplies a real
 * in-process implementation — a spec-conformant one, not a hand-written stub, so
 * transactions, `onupgradeneeded` and request lifecycles behave as they do in a
 * browser rather than as whatever a mock happened to model.
 *
 * That distinction matters here: every entry point in this module hangs off
 * transaction and request callbacks (`tx.oncomplete`, `req.onsuccess`), and a
 * stub that resolved those synchronously would pass tests the real API would
 * fail.
 *
 * Two halves are covered:
 *
 *  - **The unavailable path.** `isIndexedDbAvailable()` gates all four entry
 *    points, and that is the branch every server-side render takes. It is
 *    exercised by removing the global, since the module checks at call time.
 *  - **The working path.** Round-trip, cache miss, TTL expiry (a stale entry
 *    must read back as `null` *and* be evicted), clearing, and failures
 *    degrading quietly instead of propagating.
 */

/** The implementation `fake-indexeddb/auto` installed, kept for restoration. */
const realIndexedDb = globalThis.indexedDB

/** A fresh database per test, so entries never leak between them. */
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  jest.restoreAllMocks()
  globalThis.indexedDB = realIndexedDb
})

/** IndexedDB writes settle on transaction callbacks; let the queue drain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 10))

describe('when IndexedDB is unavailable', () => {
  // The server-side path: lib/cache.ts imports this module and runs it in the
  // Node serverless runtime. Without the guard, every cache miss would throw
  // `ReferenceError: indexedDB is not defined` on the hot path.
  beforeEach(() => {
    // @ts-expect-error — deliberately removing the global to model SSR.
    delete globalThis.indexedDB
  })

  it('persist resolves without throwing', async () => {
    await expect(persistToIndexedDB('key', { a: 1 }, 60_000)).resolves.toBeUndefined()
  })

  it('read resolves to null rather than throwing', async () => {
    await expect(readFromIndexedDB('key')).resolves.toBeNull()
  })

  it('clear resolves without throwing', async () => {
    await expect(clearIndexedDBCache()).resolves.toBeUndefined()
  })

  it('does nothing at all, so a caller can rely on the in-memory tier', async () => {
    await persistToIndexedDB('key', { a: 1 }, 60_000)
    await expect(readFromIndexedDB('key')).resolves.toBeNull()
  })
})

describe('round-trip', () => {
  it('reads back what was written', async () => {
    await persistToIndexedDB('user:octocat', { login: 'octocat' }, 60_000)
    await expect(readFromIndexedDB('user:octocat')).resolves.toEqual({ login: 'octocat' })
  })

  it('returns null for a key that was never written', async () => {
    await expect(readFromIndexedDB('never-written')).resolves.toBeNull()
  })

  it('keeps separate keys separate', async () => {
    await persistToIndexedDB('a', { v: 1 }, 60_000)
    await persistToIndexedDB('b', { v: 2 }, 60_000)
    await expect(readFromIndexedDB('a')).resolves.toEqual({ v: 1 })
    await expect(readFromIndexedDB('b')).resolves.toEqual({ v: 2 })
  })

  it('overwrites an existing key', async () => {
    await persistToIndexedDB('a', { v: 1 }, 60_000)
    await persistToIndexedDB('a', { v: 2 }, 60_000)
    await expect(readFromIndexedDB('a')).resolves.toEqual({ v: 2 })
  })

  it('round-trips arrays and primitives, not just objects', async () => {
    await persistToIndexedDB('list', [1, 2, 3], 60_000)
    await persistToIndexedDB('num', 42, 60_000)
    await persistToIndexedDB('str', 'hello', 60_000)
    await expect(readFromIndexedDB('list')).resolves.toEqual([1, 2, 3])
    await expect(readFromIndexedDB('num')).resolves.toBe(42)
    await expect(readFromIndexedDB('str')).resolves.toBe('hello')
  })

  it('creates the object store on first use', async () => {
    // `onupgradeneeded` runs only on a fresh database; if the store were not
    // created there, the first transaction would throw NotFoundError.
    await expect(persistToIndexedDB('first', { a: 1 }, 60_000)).resolves.toBeUndefined()
    await expect(readFromIndexedDB('first')).resolves.toEqual({ a: 1 })
  })
})

describe('TTL expiry', () => {
  it('returns null for an entry that has expired', async () => {
    // A negative TTL puts expiresAt in the past, which is what a stale entry
    // looks like on read.
    await persistToIndexedDB('stale', { v: 1 }, -1)
    await expect(readFromIndexedDB('stale')).resolves.toBeNull()
  })

  it('evicts the expired entry rather than leaving it to be re-checked', async () => {
    await persistToIndexedDB('stale', { v: 1 }, -1)
    await readFromIndexedDB('stale')
    await flush()

    // If the removal did not happen, this second read would still find the
    // record and the cache would grow with entries that can never be served.
    await expect(readFromIndexedDB('stale')).resolves.toBeNull()
  })

  it('serves an entry that is still within its TTL', async () => {
    await persistToIndexedDB('fresh', { v: 1 }, 60_000)
    await expect(readFromIndexedDB('fresh')).resolves.toEqual({ v: 1 })
  })

  it('treats expiry as strictly past, not at the boundary', async () => {
    const now = 1_800_000_000_000
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now)
    await persistToIndexedDB('edge', { v: 1 }, 1_000)

    // Exactly at expiresAt the check is `now > expiresAt`, so it is still valid.
    nowSpy.mockReturnValue(now + 1_000)
    await expect(readFromIndexedDB('edge')).resolves.toEqual({ v: 1 })

    nowSpy.mockReturnValue(now + 1_001)
    await expect(readFromIndexedDB('edge')).resolves.toBeNull()
  })
})

describe('clearing the cache', () => {
  it('removes every entry', async () => {
    await persistToIndexedDB('a', { v: 1 }, 60_000)
    await persistToIndexedDB('b', { v: 2 }, 60_000)
    await clearIndexedDBCache()
    await flush()
    await expect(readFromIndexedDB('a')).resolves.toBeNull()
    await expect(readFromIndexedDB('b')).resolves.toBeNull()
  })

  it('is safe on an empty cache', async () => {
    await expect(clearIndexedDBCache()).resolves.toBeUndefined()
  })

  it('leaves the cache usable afterwards', async () => {
    await persistToIndexedDB('a', { v: 1 }, 60_000)
    await clearIndexedDBCache()
    await flush()
    await persistToIndexedDB('a', { v: 3 }, 60_000)
    await expect(readFromIndexedDB('a')).resolves.toEqual({ v: 3 })
  })
})

describe('failures degrade quietly', () => {
  /** Replaces `indexedDB.open` with one that fires `onerror`. */
  const failOpen = () => {
    jest.spyOn(globalThis.indexedDB, 'open').mockImplementation(() => {
      const request = {
        error: new Error('QuotaExceededError'),
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      }
      // Fire asynchronously, the way a real request does.
      setTimeout(() => request.onerror?.(), 0)
      return request as unknown as IDBOpenDBRequest
    })
  }

  it('persist swallows an open failure', async () => {
    // A write that cannot happen must not break the caller — the in-memory
    // tier is still serving, and a failed cache write is not a page error.
    failOpen()
    await expect(persistToIndexedDB('a', { v: 1 }, 60_000)).resolves.toBeUndefined()
  })

  it('read returns null on an open failure', async () => {
    failOpen()
    await expect(readFromIndexedDB('a')).resolves.toBeNull()
  })

  it('clear swallows an open failure', async () => {
    failOpen()
    await expect(clearIndexedDBCache()).resolves.toBeUndefined()
  })

  it('read returns null when the object store is missing', async () => {
    // Models a database opened at a version without the store — the
    // transaction throws synchronously and the catch has to absorb it.
    jest.spyOn(globalThis.indexedDB, 'open').mockImplementation(() => {
      const db = {
        transaction: () => {
          throw new Error('NotFoundError')
        },
        close: jest.fn(),
        objectStoreNames: { contains: () => true },
      }
      const request = {
        result: db,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      }
      setTimeout(() => request.onsuccess?.(), 0)
      return request as unknown as IDBOpenDBRequest
    })
    await expect(readFromIndexedDB('a')).resolves.toBeNull()
  })

  it('persist swallows a transaction failure', async () => {
    jest.spyOn(globalThis.indexedDB, 'open').mockImplementation(() => {
      const db = {
        transaction: () => {
          throw new Error('TransactionInactiveError')
        },
        close: jest.fn(),
        objectStoreNames: { contains: () => true },
      }
      const request = {
        result: db,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      }
      setTimeout(() => request.onsuccess?.(), 0)
      return request as unknown as IDBOpenDBRequest
    })
    await expect(persistToIndexedDB('a', { v: 1 }, 60_000)).resolves.toBeUndefined()
  })
})
