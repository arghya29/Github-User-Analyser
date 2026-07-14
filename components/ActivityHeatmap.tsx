import { memo } from 'react'
import type { ContributionsData } from '@/types/github'
import CustomChartContainer from './charts/CustomChartContainer'

interface ActivityHeatmapProps {
  data: ContributionsData
}

const LEVEL_COLORS = [
  'bg-gray-200 dark:bg-slate-700/60', // 0 contributions
  'bg-blue-200 dark:bg-blue-900',
  'bg-blue-400 dark:bg-blue-700',
  'bg-blue-600 dark:bg-blue-500',
  'bg-blue-700 dark:bg-blue-400',
]

function levelFor(count: number, max: number): number {
  if (count === 0) return 0
  if (max <= 4) return count >= max ? 4 : 3

  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

function monthLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('default', { month: 'short', timeZone: 'UTC' })
}

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = data?.weeks ?? []
  const max = Math.max(
    0,
    // FIXED 1: Changed day.contributionCount to day.count
    ...weeks.flatMap((week) => week.contributionDays.map((day) => day.count))
  )

  // Show month label only on first week that contains a day from that month
  const shownMonths = new Set<string>()

  return (
    <CustomChartContainer title="Contribution Activity">
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[2px]">
          {weeks.map((week, weekIndex) => {
            const firstDay = week.contributionDays[0]
            const month = firstDay ? monthLabel(firstDay.date) : ''
            const showMonth = month && !shownMonths.has(month)

            if (showMonth) shownMonths.add(month)

            return (
              <div key={weekIndex} className="flex flex-col gap-[2px]">
                <div className="relative h-4 w-3">
                  {showMonth && (
                    <span className="absolute left-0 top-0 text-[10px] leading-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {month}
                    </span>
                  )}
                </div>

                {week.contributionDays.map((day) => {
                  // FIXED 2: Changed day.contributionCount to day.count
                  const level = levelFor(day.count, max)
                  const dateStr = new Date(day.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  return (
                    <div
                      key={day.date}
                      className={`h-3 w-3 rounded-sm ${LEVEL_COLORS[level]}`}
                      // FIXED 3: Changed day.contributionCount to day.count
                      title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${dateStr}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Less</span>
          {LEVEL_COLORS.map((color, idx) => (
            <div key={idx} className={`h-3 w-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </CustomChartContainer>
  )
}

// renders a full year of contribution cells — the most expensive render on the
// dashboard, and its data never changes while the user filters or sorts.
export default memo(ActivityHeatmap)
