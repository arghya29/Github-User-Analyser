/**
 * @jest-environment jsdom
 */
import {
  queueOfflineContribution,
  getPendingContributions,
  clearSyncedContributions,
} from '@/lib/offlineQueue'
import type { ContributionDay } from '@/types/github'

const PENDING_KEY = 'gh-analyzer-pending'

function day(overrides: Partial<ContributionDay> = {}): ContributionDay {
  return { date: '2026-01-01', count: 3, ...overrides } as unknown as ContributionDay
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('queueOfflineContribution', () => {
  it('appends entries in order with syncedAt null', () => {
    queueOfflineContribution('alice', day({ count: 1 }))
    queueOfflineContribution('bob', day({ count: 2 }))
    const pending = getPendingContributions()
    expect(pending).toHaveLength(2)
    expect(pending[0].username).toBe('alice')
    expect(pending[1].username).toBe('bob')
    expect(pending[0].syncedAt).toBeNull()
  })
})

describe('getPendingContributions', () => {
  it('returns [] when nothing is queued', () => {
    expect(getPendingContributions()).toEqual([])
  })

  it('returns [] when the stored value is corrupt JSON', () => {
    window.localStorage.setItem(PENDING_KEY, 'not-json')
    expect(getPendingContributions()).toEqual([])
  })
})

describe('clearSyncedContributions', () => {
  it('empties the queue', () => {
    queueOfflineContribution('alice', day())
    clearSyncedContributions()
    expect(getPendingContributions()).toEqual([])
  })
})

describe('round trip', () => {
  it('queue -> read -> clear -> read-empty', () => {
    queueOfflineContribution('alice', day())
    queueOfflineContribution('bob', day())
    expect(getPendingContributions()).toHaveLength(2)
    clearSyncedContributions()
    expect(getPendingContributions()).toEqual([])
  })
})
