import type { ContributionDay, ContributionWeek, ProductivityStats } from '@/types/github'

/**
 * Computes the current contribution streak from a chronologically-ordered
 * list of days (oldest first). An in-progress today with zero contributions
 * does NOT reset the streak: GitHub treats today as not-yet-broken until you
 * commit, so we skip a trailing zero-count today and count back from
 * yesterday. Only a gap on a day before today ends the streak.
 *
 * Shared by the Productivity panel and the README badge so the two can't
 * drift out of sync.
 */
export function computeCurrentStreak(days: ContributionDay[]): number {
  if (days.length === 0) return 0

  // Start from the most recent day. If it's today-with-no-contributions-yet
  // (a trailing zero), skip it so an active streak isn't wiped before the
  // user commits today.
  let startIndex = days.length - 1
  if (days[startIndex].count === 0) {
    startIndex--
  }

  let streak = 0
  for (let i = startIndex; i >= 0; i--) {
    if (days[i].count > 0) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function computeProductivityStats(weeks: ContributionWeek[]): ProductivityStats {
  const days = weeks
    .flatMap((w) => w.contributionDays)
    .sort((a, b) => a.date.localeCompare(b.date))

  const currentStreak = computeCurrentStreak(days)

  let longestStreak = 0
  let running = 0
  for (const day of days) {
    if (day.count > 0) {
      running++
      longestStreak = Math.max(longestStreak, running)
    } else {
      running = 0
    }
  }

  let mostProductiveDay: { date: string; count: number } | null = null
  let weekdayCount = 0
  let weekendCount = 0
  const monthlyMap = new Map<string, number>()

  for (const day of days) {
    if (!mostProductiveDay || day.count > mostProductiveDay.count) {
      mostProductiveDay = { date: day.date, count: day.count }
    }

    const dayOfWeek = new Date(`${day.date}T00:00:00Z`).getUTCDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount += day.count
    } else {
      weekdayCount += day.count
    }

    const monthKey = new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + day.count)
  }

  // `days` is already chronologically sorted, so Map insertion order is chronological too
  const monthlyTotals = Array.from(monthlyMap.entries()).map(([month, count]) => ({
    month,
    count,
  }))

  return {
    currentStreak,
    longestStreak,
    mostProductiveDay,
    weekdayCount,
    weekendCount,
    monthlyTotals,
  }
}