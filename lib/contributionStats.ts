import type { ContributionWeek, ProductivityStats } from '@/types/github'

export function computeProductivityStats(weeks: ContributionWeek[]): ProductivityStats {
  const days = weeks
    .flatMap((w) => w.contributionDays)
    .sort((a, b) => a.date.localeCompare(b.date))

  let currentStreak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++
    } else {
      break
    }
  }

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