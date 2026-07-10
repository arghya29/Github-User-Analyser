/**
 * @jest-environment jsdom
 */
import { getFavorites, isFavorite, addFavorite, removeFavorite } from '@/lib/favorites'

const FAVORITES_KEY = 'github-analyzer-favorites'

beforeEach(() => {
  window.localStorage.clear()
})

describe('addFavorite', () => {
  it('adds a favorite and persists it', () => {
    const list = addFavorite('alice')
    expect(list).toContain('alice')
    expect(getFavorites()).toContain('alice')
  })

  it('prepends the newest favorite', () => {
    addFavorite('alice')
    const list = addFavorite('bob')
    expect(list[0]).toBe('bob')
    expect(list).toContain('alice')
  })

  it('does not add a case-insensitive duplicate', () => {
    addFavorite('alice')
    const list = addFavorite('ALICE')
    expect(list.filter((f) => f.toLowerCase() === 'alice')).toHaveLength(1)
  })

  it('caps the list at the maximum', () => {
    for (let i = 0; i < 60; i++) addFavorite(`user${i}`)
    expect(getFavorites().length).toBeLessThanOrEqual(50)
  })
})

describe('removeFavorite', () => {
  it('removes a favorite case-insensitively and leaves the rest', () => {
    addFavorite('alice')
    addFavorite('bob')
    const list = removeFavorite('ALICE')
    expect(list).not.toContain('alice')
    expect(list).toContain('bob')
  })
})

describe('isFavorite', () => {
  it('returns true for a favorited user (case-insensitive)', () => {
    addFavorite('alice')
    expect(isFavorite('ALICE')).toBe(true)
  })

  it('returns false for a non-favorited user', () => {
    expect(isFavorite('nobody')).toBe(false)
  })
})

describe('getFavorites', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(getFavorites()).toEqual([])
  })

  it('ignores a corrupt stored value', () => {
    window.localStorage.setItem(FAVORITES_KEY, 'not json{')
    expect(getFavorites()).toEqual([])
  })

  it('filters out non-string entries', () => {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(['alice', 42, null, 'bob']))
    expect(getFavorites()).toEqual(['alice', 'bob'])
  })
})
