/**
 * @jest-environment jsdom
 */
import { loadHistory, recordSearch, clearHistory } from '@/lib/searchHistory'

const HISTORY_KEY = 'github-analyzer-history'

beforeEach(() => {
  window.localStorage.clear()
})

describe('recordSearch', () => {
  it('prepends the newest entry', () => {
    recordSearch('alice')
    const list = recordSearch('bob')
    expect(list[0]).toBe('bob')
    expect(list).toContain('alice')
  })

  it('de-duplicates case-insensitively, moving the repeat to the front', () => {
    recordSearch('alice')
    recordSearch('bob')
    const list = recordSearch('ALICE')
    expect(list[0]).toBe('ALICE')
    expect(list.filter((h) => h.toLowerCase() === 'alice')).toHaveLength(1)
  })

  it('caps the history at 5 entries (oldest dropped)', () => {
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) recordSearch(name)
    const list = loadHistory()
    expect(list).toHaveLength(5)
    expect(list[0]).toBe('f')
    expect(list).not.toContain('a')
  })
})

describe('loadHistory', () => {
  it('returns [] when storage is empty', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns [] when the stored value is invalid JSON', () => {
    window.localStorage.setItem(HISTORY_KEY, '{not json')
    expect(loadHistory()).toEqual([])
  })

  it('filters out non-string entries from a corrupt array', () => {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(['ok', 42, null, 'fine'])
    )
    expect(loadHistory()).toEqual(['ok', 'fine'])
  })
})

describe('clearHistory', () => {
  it('empties the stored history', () => {
    recordSearch('alice')
    expect(clearHistory()).toEqual([])
    expect(loadHistory()).toEqual([])
  })
})
