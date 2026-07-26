import type { Repository } from '@/types/github'
import { computeHealthScore } from '@/lib/healthScore'

interface RepoHealthAnalysisPanelProps {
  repo: Repository
}

export default function RepoHealthAnalysisPanel({ repo }: RepoHealthAnalysisPanelProps) {
  const { score, label, breakdown, issueHealthKnown } = computeHealthScore(repo)

  const tips = []
  if (breakdown.recency < 40) {
    tips.push('Repository has not been updated recently. Consider commit releases.')
  }
  // Only advise on issues when the closed count was actually available.
  // Without it the score is a neutral placeholder, and telling an owner to
  // "resolve outstanding issues" on that basis is advice from no evidence.
  if (issueHealthKnown && breakdown.issueHealth < 30 && (repo.open_issues_count ?? 0) > 0) {
    tips.push('Higher open issues count. Try resolving outstanding issues.')
  }
  if (breakdown.license === 0) {
    tips.push('Missing license details. Add a LICENSE file (e.g. MIT, Apache-2.0).')
  }
  if (breakdown.documentation === 0) {
    tips.push('Missing description. Update the repository about section or README.')
  }

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Health Rating</span>
        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
          score >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' :
          score >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
          score >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
          'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'
        }`}>
          {label} ({score}/100)
        </span>
      </div>

      {tips.length > 0 ? (
        <div className="space-y-1.5 mt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suggestions:</span>
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 items-start">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">✓ Perfect score! Keep up the good work.</p>
      )}
    </div>
  )
}
