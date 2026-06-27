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
 *
 * @param days Contribution days in chronological order, oldest first; the last
 *   element is treated as the most recent day. Passing unsorted data will
 *   silently produce a wrong streak, so callers must sort before calling.
 * @returns The number of consecutive non-zero days ending at the most recent
 *   day, skipping a zero-count current (in-progress) day.
 */
export function computeCurrentStreak(days: ContributionDay[]): number {
  if (days.length === 0) return 0

  const lastDay = days[days.length - 1]

  // Decide whether the final day is "today's" in-progress day. GitHub's
  // contributionCalendar is timezone-aware but returns bare YYYY-MM-DD dates
  // with no timezone, and the account's timezone isn't exposed by the API — so
  // we can't read it directly. What we DO know: a live calendar always ends on
  // the current day in the account's timezone, and every timezone (UTC-12..+14)
  // puts that day within one calendar day of the current UTC date. So we treat
  // the final day as the current in-progress day when it falls within ±1 day of
  // UTC today (correct for any account timezone) and skip it only when it has no
  // contributions yet. A trailing zero more than a day in the past is a genuine
  // gap (e.g. stale/historical data) and is NOT skipped — that would report a
  // streak that has actually ended.
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const todayUtcMs = Date.parse(new Date().toISOString().slice(0, 10))
  const lastDayMs = Date.parse(lastDay.date)
  const isCurrentDay =
    Number.isFinite(lastDayMs) && Math.abs(todayUtcMs - lastDayMs) <= MS_PER_DAY

  let startIndex = days.length - 1
  if (lastDay.count === 0 && isCurrentDay) {
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

/**
 * Aggregates a user's contribution calendar into the Productivity panel stats:
 * current streak (via {@link computeCurrentStreak}), longest streak, most
 * productive single day, weekday vs weekend totals, and per-month totals.
 *
 * Input weeks are flattened and sorted chronologically (oldest first) up front,
 * so all downstream calculations — including the chronological ordering of
 * `monthlyTotals` — rely on that single sort. All date math is done in UTC to
 * match GitHub's contribution dates.
 */
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