/**
 * Tests for the in-memory error log.
 *
 * `lib/errorLogger.ts` keeps a module-level `LOG_QUEUE` capped at 50 entries.
 * Nothing previously verified that the cap holds or that the *oldest* entries
 * are the ones dropped — and a bounded queue that quietly stops being bounded
 * grows without limit in a long-lived session, which is the failure this file
 * exists to prevent.
 *
 * The queue is module state shared by every test, so each one starts by
 * clearing it rather than relying on ordering.
 */

import {
  logError,
  logWarn,
  getRecentLogs,
  clearLogs,
} from '@/lib/errorLogger'

/** Mirrors MAX_LOG_QUEUE in the module under test. */
const MAX_LOG_QUEUE = 50

beforeEach(() => {
  clearLogs()
  jest.restoreAllMocks()
  // Silenced, not asserted on. Under `NODE_ENV=development` the logger really
  // does print, and the bounded-queue tests push hundreds of entries — without
  // this the suite buries its own output. See the note below on why the
  // console calls themselves are not asserted.
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('logError', () => {
  it('records an Error using its message', () => {
    logError('fetchUser', new Error('boom'))
    const [entry] = getRecentLogs()
    expect(entry.level).toBe('error')
    expect(entry.message).toBe('[fetchUser] boom')
  })

  it('records a thrown string', () => {
    // Anything can be thrown in JavaScript; the logger must not assume Error.
    logError('fetchUser', 'plain failure')
    expect(getRecentLogs()[0].message).toBe('[fetchUser] plain failure')
  })

  it('records a thrown object without throwing itself', () => {
    expect(() => logError('fetchUser', { code: 500 })).not.toThrow()
    expect(getRecentLogs()[0].message).toBe('[fetchUser] [object Object]')
  })

  it('records null and undefined', () => {
    logError('a', null)
    logError('b', undefined)
    expect(getRecentLogs().map((e) => e.message)).toEqual(['[a] null', '[b] undefined'])
  })

  it('attaches the supplied data', () => {
    logError('fetchUser', new Error('boom'), { username: 'octocat' })
    expect(getRecentLogs()[0].data).toEqual({ username: 'octocat' })
  })

  it('leaves data undefined when none is given', () => {
    logError('fetchUser', new Error('boom'))
    expect(getRecentLogs()[0].data).toBeUndefined()
  })

  it('stamps an ISO timestamp', () => {
    logError('fetchUser', new Error('boom'))
    const { timestamp } = getRecentLogs()[0]
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false)
  })
})

describe('logWarn', () => {
  it('records at warn level', () => {
    logWarn('cache', 'miss')
    const [entry] = getRecentLogs()
    expect(entry.level).toBe('warn')
    expect(entry.message).toBe('[cache] miss')
  })

  it('shares the queue with logError, preserving insertion order', () => {
    logError('a', new Error('first'))
    logWarn('b', 'second')
    expect(getRecentLogs().map((e) => e.level)).toEqual(['error', 'warn'])
  })
})

describe('recording is independent of console output', () => {
  /*
   * Deliberately no assertion about console.error / console.warn.
   *
   * Both are gated on `process.env.NODE_ENV === 'development'`, and `next/jest`
   * inlines NODE_ENV at transform time — so whether that branch is live is
   * fixed when the file is compiled, not when the test runs. Asserting that it
   * prints fails under the default test env; asserting that it stays silent
   * fails when someone runs `NODE_ENV=development jest`. Either way the test
   * would be about the build configuration rather than the logger.
   *
   * What is invariant, and what callers actually depend on, is that the entry
   * reaches the queue regardless.
   */
  it('records the entry whether or not it is printed', () => {
    logError('fetchUser', new Error('boom'))
    logWarn('cache', 'miss')
    expect(getRecentLogs().map((e) => e.level)).toEqual(['error', 'warn'])
  })
})

describe('the queue stays bounded', () => {
  it('holds every entry below the cap', () => {
    for (let i = 0; i < MAX_LOG_QUEUE; i += 1) logError('ctx', `e${i}`)
    expect(getRecentLogs()).toHaveLength(MAX_LOG_QUEUE)
  })

  it('never exceeds the cap', () => {
    for (let i = 0; i < MAX_LOG_QUEUE * 4; i += 1) logError('ctx', `e${i}`)
    expect(getRecentLogs()).toHaveLength(MAX_LOG_QUEUE)
  })

  it('evicts oldest first', () => {
    for (let i = 0; i < MAX_LOG_QUEUE + 3; i += 1) logError('ctx', `e${i}`)
    const messages = getRecentLogs().map((e) => e.message)
    // e0, e1 and e2 pushed the queue past the cap and were dropped.
    expect(messages[0]).toBe('[ctx] e3')
    expect(messages[messages.length - 1]).toBe(`[ctx] e${MAX_LOG_QUEUE + 2}`)
    expect(messages).not.toContain('[ctx] e0')
  })

  it('counts warns against the same cap', () => {
    for (let i = 0; i < MAX_LOG_QUEUE; i += 1) logError('ctx', `e${i}`)
    for (let i = 0; i < 5; i += 1) logWarn('ctx', `w${i}`)
    const logs = getRecentLogs()
    expect(logs).toHaveLength(MAX_LOG_QUEUE)
    expect(logs[logs.length - 1].message).toBe('[ctx] w4')
  })
})

describe('getRecentLogs', () => {
  it('returns an empty array before anything is logged', () => {
    expect(getRecentLogs()).toEqual([])
  })

  it('returns a copy, so callers cannot mutate the queue', () => {
    logError('ctx', 'one')
    const snapshot = getRecentLogs()
    snapshot.push({ level: 'error', message: 'injected', timestamp: '' })
    expect(getRecentLogs()).toHaveLength(1)
  })

  it('returns a fresh array each call', () => {
    logError('ctx', 'one')
    expect(getRecentLogs()).not.toBe(getRecentLogs())
  })
})

describe('clearLogs', () => {
  it('empties the queue', () => {
    logError('ctx', 'one')
    logWarn('ctx', 'two')
    clearLogs()
    expect(getRecentLogs()).toEqual([])
  })

  it('is safe to call on an empty queue', () => {
    expect(() => clearLogs()).not.toThrow()
    expect(getRecentLogs()).toEqual([])
  })

  it('leaves the queue usable afterwards', () => {
    logError('ctx', 'one')
    clearLogs()
    logError('ctx', 'two')
    expect(getRecentLogs().map((e) => e.message)).toEqual(['[ctx] two'])
  })
})
