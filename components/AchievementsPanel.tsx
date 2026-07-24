import { useState } from 'react'
import AchievementsCardDetail from './AchievementsCardDetail'

interface AchievementsPanelProps {
  totalContributions: number
  currentStreak: number
  totalPullRequests: number
}

interface AchievementItem {
  label: string
  value: number
  milestones: number[]
  unit: string
  description: string
  color: string
  icon: string
}

function getMilestoneProgress(value: number, milestones: number[]) {
  const completed = milestones.filter((m) => value >= m)
  const next = milestones.find((m) => value < m) ?? null
  const prevMilestone = completed.length > 0 ? completed[completed.length - 1] : 0
  const progress = next
    ? Math.min(100, Math.round(((value - prevMilestone) / (next - prevMilestone)) * 100))
    : 100
  return { completedCount: completed.length, totalCount: milestones.length, next, progress }
}

export default function AchievementsPanel({
  totalContributions,
  currentStreak,
  totalPullRequests,
}: AchievementsPanelProps) {
  const [activeAchievement, setActiveAchievement] = useState<AchievementItem | null>(null)

  const achievements: AchievementItem[] = [
    {
      label: 'Total Contributions',
      value: totalContributions,
      milestones: [100, 500, 1000, 2500, 5000, 10000],
      unit: 'contributions',
      description:
        'Your cumulative volume of commits, issues, and reviews submitted across public projects.',
      color: 'from-blue-500 to-indigo-600 text-white',
      icon: '🏆',
    },
    {
      label: 'Current Streak',
      value: currentStreak,
      milestones: [7, 30, 100, 365],
      unit: 'days',
      description:
        'Consecutive days of project activity. Consistency is the hallmark of great developers!',
      color: 'from-orange-500 to-red-600 text-white',
      icon: '🔥',
    },
    {
      label: 'Pull Requests',
      value: totalPullRequests,
      milestones: [1, 10, 50, 100, 250],
      unit: 'PRs',
      description:
        'Merge request submissions. Building bridges, fixing bugs, and writing collaborative code.',
      color: 'from-emerald-500 to-teal-600 text-white',
      icon: '🚀',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full relative">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Achievements</h3>
      <div className="space-y-5">
        {achievements.map((item) => {
          const { completedCount, totalCount, next, progress } = getMilestoneProgress(
            item.value,
            item.milestones,
          )
          const level = completedCount
          return (
            <div
              key={item.label}
              onClick={() => setActiveAchievement(item)}
              className="group p-3 border border-slate-100 dark:border-slate-600/50 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-base bg-gradient-to-br ${item.color} shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    <span>{item.icon}</span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {item.label}
                    </span>
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      Lvl {level}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  {completedCount}/{totalCount}
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden mb-1">
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {item.value.toLocaleString()} {item.unit}
                </span>
                {next !== null && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 dark:text-blue-400 text-[10px] font-medium">
                    Click to details →
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {activeAchievement && (
        <AchievementsCardDetail
          achievement={activeAchievement}
          onClose={() => setActiveAchievement(null)}
        />
      )}
    </div>
  )
}
