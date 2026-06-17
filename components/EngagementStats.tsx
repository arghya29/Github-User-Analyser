import type { EngagementStats as EngagementStatsType } from '@/types/github'

interface EngagementStatsProps {
  data: EngagementStatsType
}

export default function EngagementStats({ data }: EngagementStatsProps) {
  const items = [
    { label: 'Commits', value: data.totalCommitContributions },
    { label: 'Pull Requests', value: data.totalPullRequestContributions },
    { label: 'Issues', value: data.totalIssueContributions },
    { label: 'PR Reviews', value: data.totalPullRequestReviewContributions },
  ]

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-4">Engagement (last year)</h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="bg-slate-600/50 rounded p-4 text-center">
            <div className="text-2xl font-bold text-white">{item.value.toLocaleString()}</div>
            <div className="text-sm text-gray-400">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}