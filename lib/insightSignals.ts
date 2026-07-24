import type { ProductivityStats, Repository } from '@/types/github'

/**
 * Derives the extra signals the "growth" and "learning" insight modes need.
 *
 * Both are computed from data the profile already has — `productivity.monthlyTotals`
 * and the repo list — so neither mode costs an additional GitHub request.
 */

export type TrendDirection = 'accelerating' | 'steady' | 'cooling'

export interface ContributionTrend {
  direction: TrendDirection
  /** Percent change of the recent window vs the previous one. Null when there's no baseline to divide by. */
  changePct: number | null
  recentAvgPerMonth: number
  previousAvgPerMonth: number
  /** How many months are in each side of the comparison. */
  monthsCompared: number
}

export interface LanguageProfile {
  languageCount: number
  primaryLanguage: string | null
  primaryLanguageSharePct: number | null
  /** Non-primary languages with a meaningful share — what they also work in. */
  secondaryLanguages: string[]
  /** Languages of repos touched recently — what they're working in *now*. */
  recentLanguages: string[]
}

/** A window must move at least this much to count as more than noise. */
const TREND_THRESHOLD_PCT = 15
/** Longest comparison window, in months, on each side. */
const MAX_TREND_WINDOW = 3
/** A repo counts as "recent" if it was pushed within this many days. */
const RECENT_REPO_DAYS = 90
/** Minimum share of a developer's code for a language to be worth naming. */
const SECONDARY_MIN_SHARE_PCT = 5

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Compares recent contribution volume against the preceding period to say whether
 * activity is accelerating, steady, or cooling.
 *
 * `monthlyTotals` is chronological (oldest first) by construction in
 * `computeProductivityStats`, so ordering is taken from the array itself — the
 * `month` values are display strings ("Jan 2026") and are never parsed.
 *
 * The final bucket is the month currently *in progress*, so it is systematically
 * short. Measuring a half-finished month against complete ones reads as a decline
 * that isn't real, so it is excluded by default whenever enough history remains.
 */
export function computeContributionTrend(
  monthlyTotals: ProductivityStats['monthlyTotals'] | undefined,
  options: { excludeCurrentMonth?: boolean } = {},
): ContributionTrend | null {
  const { excludeCurrentMonth = true } = options
  const totals = Array.isArray(monthlyTotals) ? monthlyTotals : []

  const series = excludeCurrentMonth && totals.length >= 4 ? totals.slice(0, -1) : totals

  const n = series.length
  const window = Math.min(MAX_TREND_WINDOW, Math.floor(n / 2))
  if (window < 1) return null

  const average = (bucket: { count: number }[]) =>
    bucket.reduce((sum, m) => sum + (Number.isFinite(m?.count) ? m.count : 0), 0) / bucket.length

  const recentAvgPerMonth = round1(average(series.slice(n - window)))
  const previousAvgPerMonth = round1(average(series.slice(n - 2 * window, n - window)))

  let changePct: number | null = null
  let direction: TrendDirection

  if (previousAvgPerMonth > 0) {
    changePct = round1(((recentAvgPerMonth - previousAvgPerMonth) / previousAvgPerMonth) * 100)
    direction =
      changePct >= TREND_THRESHOLD_PCT
        ? 'accelerating'
        : changePct <= -TREND_THRESHOLD_PCT
          ? 'cooling'
          : 'steady'
  } else {
    // No baseline to divide by — a percentage would be meaningless (or Infinity).
    // Ramping up from nothing is still acceleration; nothing-to-nothing is flat.
    direction = recentAvgPerMonth > 0 ? 'accelerating' : 'steady'
  }

  return {
    direction,
    changePct,
    recentAvgPerMonth,
    previousAvgPerMonth,
    monthsCompared: window,
  }
}

/**
 * Summarizes language breadth and current focus.
 *
 * Languages are weighted by bytes when the GraphQL path supplied per-language
 * detail. When only the REST path ran, repos carry a single primary `language` and
 * no byte counts, so each repo contributes one unit instead — the two never mix in
 * practice (a profile comes from one path or the other), and the ranking stays
 * meaningful either way.
 */
export function computeLanguageProfile(
  repos: Repository[] | undefined,
  options: { now?: Date; recentDays?: number } = {},
): LanguageProfile {
  const now = options.now ?? new Date()
  const recentDays = options.recentDays ?? RECENT_REPO_DAYS
  const cutoff = now.getTime() - recentDays * 24 * 60 * 60 * 1000

  const weights = new Map<string, number>()
  const recent = new Set<string>()

  for (const repo of Array.isArray(repos) ? repos : []) {
    if (!repo) continue

    const detail = Array.isArray(repo.languages) ? repo.languages : []
    const named = detail
      .filter((l) => l && typeof l.name === 'string' && l.name.length > 0)
      .map((l) => ({ name: l.name, bytes: Number.isFinite(l.bytes) ? Math.max(0, l.bytes) : 0 }))

    if (named.length > 0) {
      for (const lang of named) {
        weights.set(lang.name, (weights.get(lang.name) ?? 0) + lang.bytes)
      }
    } else if (typeof repo.language === 'string' && repo.language.length > 0) {
      weights.set(repo.language, (weights.get(repo.language) ?? 0) + 1)
    }

    const updatedAt = typeof repo.updated_at === 'string' ? Date.parse(repo.updated_at) : NaN
    if (Number.isFinite(updatedAt) && updatedAt >= cutoff) {
      const names =
        named.length > 0
          ? named.map((l) => l.name)
          : typeof repo.language === 'string' && repo.language.length > 0
            ? [repo.language]
            : []
      for (const name of names) recent.add(name)
    }
  }

  const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, weight]) => sum + weight, 0)

  const primaryLanguage = ranked[0]?.[0] ?? null
  const primaryLanguageSharePct =
    primaryLanguage !== null && total > 0 ? round1((ranked[0][1] / total) * 100) : null

  const secondaryLanguages =
    total > 0
      ? ranked
          .slice(1)
          .filter(([, weight]) => (weight / total) * 100 >= SECONDARY_MIN_SHARE_PCT)
          .map(([name]) => name)
          .slice(0, 5)
      : []

  return {
    languageCount: ranked.length,
    primaryLanguage,
    primaryLanguageSharePct,
    secondaryLanguages,
    recentLanguages: [...recent].slice(0, 8),
  }
}
