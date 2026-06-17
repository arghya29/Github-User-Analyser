interface AchievementsPanelProps {
  totalContributions: number
  currentStreak: number
  totalPullRequests: number
}

interface Track {
  label: string
  value: number
  milestones: number[]
  unit: string
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

function AchievementTrack({ label, value, milestones, unit }: Track) {
  const { completedCount, totalCount, next, progress } = getMilestoneProgress(value, milestones)

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-500">
          {completedCount}/{totalCount} milestones
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-600 overflow-hidden mb-1">
        <div className="bg-blue-500 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs text-gray-400">
        {next !== null
          ? `${value.toLocaleString()} / ${next.toLocaleString()} ${unit}`
          : `${value.toLocaleString()} ${unit} — all milestones reached`}
      </div>
    </div>
  )
}

export default function AchievementsPanel({
  totalContributions,
  currentStreak,
  totalPullRequests,
}: AchievementsPanelProps) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-4">Achievements</h3>
      <div className="space-y-5">
        <AchievementTrack
          label="Total contributions"
          value={totalContributions}
          milestones={[100, 500, 1000, 2500, 5000, 10000]}
          unit="contributions"
        />
        <AchievementTrack
          label="Current streak"
          value={currentStreak}
          milestones={[7, 30, 100, 365]}
          unit="days"
        />
        <AchievementTrack
          label="Pull requests"
          value={totalPullRequests}
          milestones={[1, 10, 50, 100, 250]}
          unit="PRs"
        />
      </div>
    </div>
  )
}