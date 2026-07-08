import { useMemo, useState } from 'react'
import type { Repository } from '@/types/github'
import { summarizeReposHealth, getHealthColor, getHealthBg } from '@/lib/repoHealth'

interface RepoHealthDashboardProps {
  repos: Repository[]
}

export default function RepoHealthDashboard({ repos }: RepoHealthDashboardProps) {
  const [collapsed, setCollapsed] = useState(false)

  const summaries = useMemo(() => summarizeReposHealth(repos), [repos])

  const avgScore = useMemo(() => {
    if (!summaries.length) return 0
    return Math.round(summaries.reduce((s, r) => s + r.score, 0) / summaries.length)
  }, [summaries])

  const distribution = useMemo(() => {
    const dist = { excellent: 0, good: 0, fair: 0, needsWork: 0 }
    for (const s of summaries) {
      if (s.score >= 80) dist.excellent++
      else if (s.score >= 60) dist.good++
      else if (s.score >= 40) dist.fair++
      else dist.needsWork++
    }
    return dist
  }, [summaries])

  const best = useMemo(() => {
    if (!summaries.length) return null
    return summaries.reduce((a, b) => (a.score > b.score ? a : b))
  }, [summaries])

  const worst = useMemo(() => {
    if (!summaries.length) return null
    return summaries.reduce((a, b) => (a.score < b.score ? a : b))
  }, [summaries])

  const missingLicense = useMemo(
    () => summaries.filter((s) => !s.hasLicense).length,
    [summaries]
  )
  const missingDescription = useMemo(
    () => summaries.filter((s) => !s.hasDescription).length,
    [summaries]
  )

  if (!repos.length) return null

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Repository Health Dashboard</h2>
        <span className="text-xs text-gray-400">{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>

      {!collapsed && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className={`text-2xl font-bold ${getHealthColor(avgScore)}`}>{avgScore}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average Health</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{distribution.excellent}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excellent</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{missingLicense}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Missing License</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{missingDescription}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">No Description</div>
            </div>
          </div>

          {/* Distribution bar */}
          <div className="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden mb-6 flex">
            {distribution.excellent > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(distribution.excellent / summaries.length) * 100}%` }}
                title={`Excellent: ${distribution.excellent}`}
              />
            )}
            {distribution.good > 0 && (
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${(distribution.good / summaries.length) * 100}%` }}
                title={`Good: ${distribution.good}`}
              />
            )}
            {distribution.fair > 0 && (
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${(distribution.fair / summaries.length) * 100}%` }}
                title={`Fair: ${distribution.fair}`}
              />
            )}
            {distribution.needsWork > 0 && (
              <div
                className="bg-red-500 h-full transition-all"
                style={{ width: `${(distribution.needsWork / summaries.length) * 100}%` }}
                title={`Needs Work: ${distribution.needsWork}`}
              />
            )}
          </div>

          {/* Best & Worst */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {best && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Best</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{best.repoName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {best.score}/100 — {best.label}
                </p>
              </div>
            )}
            {worst && worst.repoName !== best?.repoName && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">Needs Attention</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{worst.repoName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {worst.score}/100 — {worst.label}
                </p>
              </div>
            )}
          </div>

          {/* Full list */}
          <div className="space-y-2">
            {summaries.slice(0, 20).map((s) => (
              <div key={s.repoName} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${getHealthBg(s.score)} shrink-0`} />
                <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{s.repoName}</span>
                <span className={`font-medium ${getHealthColor(s.score)}`}>{s.score}</span>
              </div>
            ))}
            {summaries.length > 20 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                +{summaries.length - 20} more repos
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
