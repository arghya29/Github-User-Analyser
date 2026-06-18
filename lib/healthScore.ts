import type { Repository } from '@/types/github'

export interface HealthScoreResult {
  score: number // 0-100
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs attention'
  breakdown: {
    recency: number // 0-40
    issueHealth: number // 0-30
    license: number // 0-15
    documentation: number // 0-15
  }
}

function recencyScore(updatedAt: string): number {
  const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate <= 30) return 40
  if (daysSinceUpdate <= 90) return 32
  if (daysSinceUpdate <= 180) return 22
  if (daysSinceUpdate <= 365) return 12
  return 4
}

function issueHealthScore(open?: number, closed?: number): number {
  const totalIssues = (open || 0) + (closed || 0)
  if (totalIssues === 0) return 24 // no issues filed isn't necessarily bad — neutral-good
  const closedRatio = (closed || 0) / totalIssues
  return Math.round(closedRatio * 30)
}

export function computeHealthScore(repo: Repository): HealthScoreResult {
  const recency = recencyScore(repo.updated_at)
  const issueHealth = issueHealthScore(repo.open_issues_count, repo.closed_issues_count)
  const license = repo.license ? 15 : 0
  const documentation = repo.description && repo.description.trim().length > 0 ? 15 : 0

  const score = Math.min(100, recency + issueHealth + license + documentation)

  let label: HealthScoreResult['label'] = 'Needs attention'
  if (score >= 80) label = 'Excellent'
  else if (score >= 60) label = 'Good'
  else if (score >= 40) label = 'Fair'

  return { score, label, breakdown: { recency, issueHealth, license, documentation } }
}