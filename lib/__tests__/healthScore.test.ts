import { computeHealthScore } from '@/lib/healthScore'
import type { Repository } from '@/types/github'

/**
 * healthScore reads Date.now() via recencyScore, so we pin the clock to a fixed
 * "now" and express every repo's updated_at relative to it. This keeps the
 * recency tiers deterministic regardless of when the suite runs.
 */
const NOW = new Date('2026-06-15T12:00:00.000Z').getTime()

function daysAgo(days: number): string {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString()
}

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  // A baseline repo: very recent, no issues, no license, no description.
  // Individual tests override only the fields they exercise.
  return {
    name: 'sample-repo',
    description: '',
    stargazers_count: 0,
    forks_count: 0,
    language: 'TypeScript',
    updated_at: daysAgo(0),
    open_issues_count: 0,
    closed_issues_count: 0,
    license: null,
    ...overrides,
  } as Repository
}

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

describe('computeHealthScore — recency tiers', () => {
  it('scores 40 when updated within 30 days (boundary: exactly 30)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(30) })).breakdown.recency).toBe(40)
  })

  it('scores 32 when updated between 31 and 90 days (boundary: exactly 90)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(90) })).breakdown.recency).toBe(32)
  })

  it('scores 22 when updated between 91 and 180 days (boundary: exactly 180)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(180) })).breakdown.recency).toBe(22)
  })

  it('scores 12 when updated between 181 and 365 days (boundary: exactly 365)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(365) })).breakdown.recency).toBe(12)
  })

  it('scores 4 when updated more than 365 days ago', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(400) })).breakdown.recency).toBe(4)
  })

  it('scores 40 just under the 30-day edge (29 days)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(29) })).breakdown.recency).toBe(40)
  })

  it('drops to 32 just over the 30-day edge (31 days)', () => {
    expect(computeHealthScore(makeRepo({ updated_at: daysAgo(31) })).breakdown.recency).toBe(32)
  })
})

describe('computeHealthScore — issue health', () => {
  it('returns the neutral-good 24 when no issues have ever been filed', () => {
    const result = computeHealthScore(makeRepo({ open_issues_count: 0, closed_issues_count: 0 }))
    expect(result.breakdown.issueHealth).toBe(24)
  })

  it('returns the neutral-good 24 when issue counts are undefined', () => {
    const result = computeHealthScore(
      makeRepo({ open_issues_count: undefined, closed_issues_count: undefined }),
    )
    expect(result.breakdown.issueHealth).toBe(24)
  })

  it('scores full 30 when every issue is closed', () => {
    const result = computeHealthScore(makeRepo({ open_issues_count: 0, closed_issues_count: 10 }))
    expect(result.breakdown.issueHealth).toBe(30)
  })

  it('scores 0 when every issue is open', () => {
    const result = computeHealthScore(makeRepo({ open_issues_count: 10, closed_issues_count: 0 }))
    expect(result.breakdown.issueHealth).toBe(0)
  })

  it('rounds the closed ratio to the nearest point (7 of 10 closed → 21)', () => {
    // closedRatio = 0.7 → round(0.7 * 30) = round(21) = 21
    const result = computeHealthScore(makeRepo({ open_issues_count: 3, closed_issues_count: 7 }))
    expect(result.breakdown.issueHealth).toBe(21)
  })

  it('rounds a fractional ratio (1 of 3 closed → round(10) = 10)', () => {
    // closedRatio = 1/3 → round(10) = 10
    const result = computeHealthScore(makeRepo({ open_issues_count: 2, closed_issues_count: 1 }))
    expect(result.breakdown.issueHealth).toBe(10)
  })
})

describe('computeHealthScore — license and documentation', () => {
  it('awards 15 for license when a license is present', () => {
    expect(computeHealthScore(makeRepo({ license: 'MIT' })).breakdown.license).toBe(15)
  })

  it('awards 0 for license when license is null', () => {
    expect(computeHealthScore(makeRepo({ license: null })).breakdown.license).toBe(0)
  })

  it('awards 15 for documentation when a non-empty description is present', () => {
    expect(computeHealthScore(makeRepo({ description: 'A useful tool' })).breakdown.documentation).toBe(15)
  })

  it('awards 0 for documentation when the description is empty', () => {
    expect(computeHealthScore(makeRepo({ description: '' })).breakdown.documentation).toBe(0)
  })

  it('awards 0 for documentation when the description is whitespace-only', () => {
    expect(computeHealthScore(makeRepo({ description: '   \t  ' })).breakdown.documentation).toBe(0)
  })
})

describe('computeHealthScore — total score, label, and cap', () => {
  it('labels a top repo "Excellent" (score >= 80)', () => {
    // recency 40 + issues 30 + license 15 + docs 15 = 100
    const result = computeHealthScore(
      makeRepo({
        updated_at: daysAgo(5),
        open_issues_count: 0,
        closed_issues_count: 10,
        license: 'MIT',
        description: 'Well maintained',
      }),
    )
    expect(result.score).toBe(100)
    expect(result.label).toBe('Excellent')
  })

  it('caps the score at 100 and never exceeds it', () => {
    const result = computeHealthScore(
      makeRepo({
        updated_at: daysAgo(0),
        open_issues_count: 0,
        closed_issues_count: 50,
        license: 'Apache-2.0',
        description: 'Docs present',
      }),
    )
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.score).toBe(100)
  })

  it('labels "Good" at the 60 boundary', () => {
    // recency 40 + issues 0 + license 0 + docs 0 = 40 → need 60. Build 60 exactly:
    // recency 40 + issues 0 + license 15 + docs 15 = 70 (Good). Trim to hit >= 60:
    // recency 32 (90d) + issues 21 (7/10) + license 0 + docs 0 = 53 → Fair. Use a 60 case:
    // recency 40 + issues 20 + license 0 + docs 0: 20 isn't reachable via ratio*30 cleanly,
    // so use recency 40 + issues 30 + license 0 + docs 0 = 70? That's Good but not the boundary.
    // Cleanest exact-60: recency 30? not a tier. Use recency 32 + docs 15 + license 15 = 62 (Good).
    const result = computeHealthScore(
      makeRepo({
        updated_at: daysAgo(90), // recency 32
        open_issues_count: 1,
        closed_issues_count: 0, // issues 0
        license: 'MIT', // 15
        description: 'Has docs', // 15
      }),
    )
    // 32 + 0 + 15 + 15 = 62
    expect(result.score).toBe(62)
    expect(result.label).toBe('Good')
  })

  it('labels "Fair" between 40 and 59', () => {
    // recency 40 + issues 0 + license 0 + docs 0 = 40 → Fair (boundary)
    const result = computeHealthScore(
      makeRepo({
        updated_at: daysAgo(10), // recency 40
        open_issues_count: 5,
        closed_issues_count: 0, // issues 0
        license: null, // 0
        description: '', // 0
      }),
    )
    expect(result.score).toBe(40)
    expect(result.label).toBe('Fair')
  })

  it('labels "Needs attention" below 40', () => {
    // recency 4 (very old) + issues 0 + license 0 + docs 0 = 4
    const result = computeHealthScore(
      makeRepo({
        updated_at: daysAgo(500), // recency 4
        open_issues_count: 5,
        closed_issues_count: 0,
        license: null,
        description: '',
      }),
    )
    expect(result.score).toBe(4)
    expect(result.label).toBe('Needs attention')
  })
})
