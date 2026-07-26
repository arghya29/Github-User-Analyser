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
  /**
   * False when closed-issue counts were unavailable, so `issueHealth` is a
   * neutral placeholder rather than a measurement. Callers that draw
   * conclusions from the issue component — a badge breakdown, or advice telling
   * the owner to close issues — should say "unavailable" instead of presenting
   * the number as fact.
   */
  issueHealthKnown: boolean
}

/**
 * Awarded when issue health cannot be judged: either no issues have ever been
 * filed, or the closed count is unavailable. Deliberately mid-range — it should
 * neither reward nor punish a repository for something unmeasured.
 */
const NEUTRAL_ISSUE_HEALTH = 24

function recencyScore(updatedAt: string): number {
  const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceUpdate <= 30) return 40
  if (daysSinceUpdate <= 90) return 32
  if (daysSinceUpdate <= 180) return 22
  if (daysSinceUpdate <= 365) return 12
  return 4
}

function issueHealthScore(open?: number, closed?: number): { score: number; known: boolean } {
  // `closed_issues_count` comes from the GraphQL path, which only runs when a
  // GITHUB_TOKEN is configured. GitHub's REST repositories endpoint has no
  // closed-issues field, so on the fallback path this is undefined — not zero.
  //
  // Treating undefined as zero made the ratio 0/open, which scored *any*
  // repository with open issues at zero while one with no issues at all
  // received the neutral 24. An actively maintained project that had closed 500
  // issues ranked below an abandoned one. Unknown has to stay distinct from
  // measured-zero for the comparison to mean anything.
  if (closed === undefined) {
    return { score: NEUTRAL_ISSUE_HEALTH, known: false }
  }

  const totalIssues = (open || 0) + closed
  if (totalIssues === 0) {
    // No issues ever filed isn't necessarily bad — neutral-good.
    return { score: NEUTRAL_ISSUE_HEALTH, known: true }
  }

  return { score: Math.round((closed / totalIssues) * 30), known: true }
}

export function computeHealthScore(repo: Repository): HealthScoreResult {
  const recency = recencyScore(repo.updated_at)
  const { score: issueHealth, known: issueHealthKnown } = issueHealthScore(
    repo.open_issues_count,
    repo.closed_issues_count
  )
  const license = repo.license ? 15 : 0
  const documentation = repo.description && repo.description.trim().length > 0 ? 15 : 0

  const score = Math.min(100, recency + issueHealth + license + documentation)

  let label: HealthScoreResult['label'] = 'Needs attention'
  if (score >= 80) label = 'Excellent'
  else if (score >= 60) label = 'Good'
  else if (score >= 40) label = 'Fair'

  return {
    score,
    label,
    breakdown: { recency, issueHealth, license, documentation },
    issueHealthKnown,
  }
}