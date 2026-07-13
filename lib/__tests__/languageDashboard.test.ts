import {
  computeLanguageDashboardStats,
  getRepoLanguageBreakdown,
} from '@/lib/languageDashboard'
import type { Repository } from '@/types/github'

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: 'r',
    description: '',
    stargazers_count: 0,
    forks_count: 0,
    language: '',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Repository
}

describe('computeLanguageDashboardStats', () => {
  it('counts repos per primary language and picks the most common as primary', () => {
    const stats = computeLanguageDashboardStats([
      repo({ name: 'a', language: 'TypeScript' }),
      repo({ name: 'b', language: 'TypeScript' }),
      repo({ name: 'c', language: 'Go' }),
    ])
    expect(stats.primaryLanguage).toBe('TypeScript')
    expect(stats.languageCount).toBe(2)
    const ts = stats.languageRepoTotals.find((l) => l.name === 'TypeScript')
    expect(ts?.count).toBe(2)
    // Sorted descending by count
    expect(stats.languageRepoTotals[0].name).toBe('TypeScript')
  })

  it('identifies the most versatile repo by language count', () => {
    const stats = computeLanguageDashboardStats([
      repo({ name: 'mono', language: 'JS', languages: [{ name: 'JS', bytes: 100 }] }),
      repo({
        name: 'poly',
        language: 'JS',
        languages: [
          { name: 'JS', bytes: 100 },
          { name: 'CSS', bytes: 50 },
          { name: 'HTML', bytes: 25 },
        ],
      }),
    ])
    expect(stats.mostVersatileRepo).toEqual({ name: 'poly', langCount: 3 })
  })

  it('returns an empty/zeroed result for no repos without throwing', () => {
    expect(computeLanguageDashboardStats([])).toEqual({
      primaryLanguage: null,
      languageCount: 0,
      mostVersatileRepo: null,
      languageRepoTotals: [],
    })
  })

  it('ignores repos whose primary language is null', () => {
    const stats = computeLanguageDashboardStats([
      repo({ name: 'a', language: null as unknown as string }),
      repo({ name: 'b', language: 'Rust' }),
    ])
    expect(stats.languageCount).toBe(1)
    expect(stats.primaryLanguage).toBe('Rust')
  })
})

describe('getRepoLanguageBreakdown', () => {
  it('computes byte percentages sorted descending', () => {
    const breakdown = getRepoLanguageBreakdown(
      repo({
        languages: [
          { name: 'CSS', bytes: 200 },
          { name: 'TypeScript', bytes: 800 },
        ],
      })
    )
    expect(breakdown.map((l) => [l.name, l.percentage])).toEqual([
      ['TypeScript', 80],
      ['CSS', 20],
    ])
  })

  it('falls back to a single 100% entry when only a primary language exists', () => {
    const breakdown = getRepoLanguageBreakdown(repo({ language: 'Python', languages: undefined }))
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].name).toBe('Python')
    expect(breakdown[0].percentage).toBe(100)
  })

  it('returns an empty array when there is no language data at all', () => {
    expect(getRepoLanguageBreakdown(repo({ language: '', languages: undefined }))).toEqual([])
  })
})
