import type { ContributionsData } from '@/types/github'

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
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { weeks, totalContributions } = data

  const allCounts = weeks.flatMap((w) => w.contributionDays.map((d) => d.count))
  const maxCount = Math.max(...allCounts, 1)

  let lastMonth = ''
  const monthMarkers = weeks.map((week) => {
    const firstDay = week.contributionDays[0]
    if (!firstDay) return ''
    const label = monthLabel(firstDay.date)
    if (label !== lastMonth) {
      lastMonth = label
      return label
    }
    return ''
  })

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div className="inline-flex gap-[3px] min-w-full">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[3px]">
            <div className="h-3 text-[10px] text-gray-400 dark:text-gray-500 leading-3 whitespace-nowrap">
              {monthMarkers[weekIdx]}
            </div>
            {week.contributionDays.map((day) => {
              const level = levelFor(day.count, maxCount)
              return (
                <div
                  key={day.date}
                  title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${new Date(
                    day.date
                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  className={`w-3 h-3 rounded-sm ${LEVEL_COLORS[level]}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-4 text-[11px] text-gray-400 dark:text-gray-400">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <span key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}