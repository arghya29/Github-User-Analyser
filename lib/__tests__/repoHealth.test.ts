import {
  computeHealthScore,
  getHealthLabel,
  getHealthColor,
  getHealthBg,
  summarizeReposHealth,
} from '@/lib/repoHealth'
import type { Repository } from '@/types/github'

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: 'r',
    description: '',
    stargazers_count: 0,
    forks_count: 0,
    language: '',
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Repository
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

describe('computeHealthScore', () => {
  it('scores a well-maintained repo high', () => {
    const score = computeHealthScore(
      repo({
        updated_at: daysAgo(5),
        description: 'A well documented project',
        license: 'MIT',
        open_issues_count: 0,
        stargazers_count: 42,
        forks_count: 7,
      })
    )
    // 50 +20(recent) +10(desc) +10(license) +10(0 issues) +5(stars) +5(forks) = clamped to 100
    expect(score).toBe(100)
  })

  it('scores a stale, undocumented, issue-heavy repo low', () => {
    const score = computeHealthScore(
      repo({
        updated_at: daysAgo(400),
        description: '',
        license: null,
        open_issues_count: 30,
        stargazers_count: 0,
        forks_count: 0,
      })
    )
    // 50 -15(>365 days) -10(>20 issues) = 25
    expect(score).toBe(25)
  })

  it('always stays within 0..100', () => {
    const score = computeHealthScore(repo({ updated_at: daysAgo(5), stargazers_count: 999 }))
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('getHealthLabel / Color / Bg boundaries', () => {
  it('maps labels at each threshold boundary', () => {
    expect(getHealthLabel(80)).toBe('Excellent')
    expect(getHealthLabel(79)).toBe('Good')
    expect(getHealthLabel(60)).toBe('Good')
    expect(getHealthLabel(59)).toBe('Fair')
    expect(getHealthLabel(40)).toBe('Fair')
    expect(getHealthLabel(39)).toBe('Needs Work')
  })

  it('changes color bucket exactly at the boundaries', () => {
    expect(getHealthColor(80)).not.toBe(getHealthColor(79))
    expect(getHealthColor(60)).not.toBe(getHealthColor(59))
    expect(getHealthColor(40)).not.toBe(getHealthColor(39))
  })

  it('changes background bucket exactly at the boundaries', () => {
    expect(getHealthBg(80)).toBe('bg-green-500')
    expect(getHealthBg(60)).toBe('bg-blue-500')
    expect(getHealthBg(40)).toBe('bg-amber-500')
    expect(getHealthBg(39)).toBe('bg-red-500')
  })
})

describe('summarizeReposHealth', () => {
  it('summarizes each repo with the expected shape', () => {
    const summaries = summarizeReposHealth([
      repo({ name: 'alpha', updated_at: daysAgo(5), description: 'd', license: 'MIT', open_issues_count: 2 }),
      repo({ name: 'beta', updated_at: daysAgo(400), open_issues_count: 0 }),
    ])
    expect(summaries).toHaveLength(2)
    expect(summaries[0].repoName).toBe('alpha')
    expect(summaries[0].hasLicense).toBe(true)
    expect(summaries[0].hasDescription).toBe(true)
    expect(summaries[0].isRecent).toBe(true)
    expect(summaries[1].repoName).toBe('beta')
    expect(summaries[1].hasLicense).toBe(false)
    expect(summaries[1].isRecent).toBe(false)
    expect(summaries[1].label).toBe(getHealthLabel(summaries[1].score))
  })
})
