import { useMemo, useState } from 'react'
import type { Repository } from '@/types/github'
import {
  summarizeReposHealth,
  getHealthColor,
  getHealthBg,
} from '@/lib/repoHealth'

interface RepoHealthDashboardProps {
  repos: Repository[]
}

export default function RepoHealthDashboard({
  repos,
}: RepoHealthDashboardProps) {
  const [collapsed, setCollapsed] = useState(false)

  const summaries = useMemo(() => summarizeReposHealth(repos), [repos])

  const avgScore = useMemo(() => {
    if (!summaries.length) return 0
    return Math.round(
      summaries.reduce((s, r) => s + r.score, 0) / summaries.length
    )
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

  const [filterLanguage, setFilterLanguage] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'missing-license' | 'no-description' | 'stale'
  >('all')

  // Languages present across the user's repos, for the drill-down dropdown.
  const languages = useMemo(() => {
    const set = new Set<string>()
    for (const r of repos) if (r.language) set.add(r.language)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [repos])

  // RepoHealthSummary has no language, so join back to repos by name.
  const languageByRepo = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const r of repos) map.set(r.name, r.language ?? null)
    return map
  }, [repos])

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (filterLanguage && languageByRepo.get(s.repoName) !== filterLanguage)
        return false
      if (filterCategory === 'missing-license' && s.hasLicense) return false
      if (filterCategory === 'no-description' && s.hasDescription) return false
      if (filterCategory === 'stale' && s.isRecent) return false
      return true
    })
  }, [summaries, filterLanguage, filterCategory, languageByRepo])

  const isFiltered = filterLanguage !== '' || filterCategory !== 'all'
  const visibleSummaries = isFiltered
    ? filteredSummaries
    : filteredSummaries.slice(0, 20)

  if (!repos.length) return null

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Repository Health Dashboard
        </h2>
        <span className="text-xs text-gray-400">
          {collapsed ? 'Expand' : 'Collapse'}
        </span>
      </button>

      {!collapsed && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className={`text-2xl font-bold ${getHealthColor(avgScore)}`}>
                {avgScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Average Health
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {distribution.excellent}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Excellent
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {missingLicense}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Missing License
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 flex-1 min-w-[120px] text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {missingDescription}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No Description
              </div>
            </div>
          </div>

          {/* Distribution bar */}
          <div className="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden mb-6 flex">
            {distribution.excellent > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{
                  width: `${(distribution.excellent / summaries.length) * 100}%`,
                }}
                title={`Excellent: ${distribution.excellent}`}
              />
            )}
            {distribution.good > 0 && (
              <div
                className="bg-blue-500 h-full transition-all"
                style={{
                  width: `${(distribution.good / summaries.length) * 100}%`,
                }}
                title={`Good: ${distribution.good}`}
              />
            )}
            {distribution.fair > 0 && (
              <div
                className="bg-amber-500 h-full transition-all"
                style={{
                  width: `${(distribution.fair / summaries.length) * 100}%`,
                }}
                title={`Fair: ${distribution.fair}`}
              />
            )}
            {distribution.needsWork > 0 && (
              <div
                className="bg-red-500 h-full transition-all"
                style={{
                  width: `${(distribution.needsWork / summaries.length) * 100}%`,
                }}
                title={`Needs Work: ${distribution.needsWork}`}
              />
            )}
          </div>

          {/* Best & Worst */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {best && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">
                  Best
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {best.repoName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {best.score}/100 — {best.label}
                </p>
              </div>
            )}
            {worst && worst.repoName !== best?.repoName && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">
                  Needs Attention
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {worst.repoName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Score: {worst.score}/100 — {worst.label}
                </p>
              </div>
            )}
          </div>

          {/* Drill-down filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              aria-label="Filter repositories by language"
              className="text-xs rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-2 py-1"
            >
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {(
              [
                ['all', 'All'],
                ['missing-license', 'Missing license'],
                ['no-description', 'No description'],
                ['stale', 'Stale'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilterCategory(value)}
                aria-pressed={filterCategory === value}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterCategory === value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filtered repo list */}
          <div className="space-y-2">
            {visibleSummaries.length > 0 ? (
              visibleSummaries.map((s) => {
                const issues: string[] = []
                if (!s.hasLicense) issues.push('No license')
                if (!s.hasDescription) issues.push('No description')
                if (!s.isRecent) issues.push('Stale')
                return (
                  <div
                    key={s.repoName}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${getHealthBg(s.score)} shrink-0`}
                    />
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                      {s.repoName}
                    </span>
                    {issues.length > 0 && (
                      <span className="hidden sm:flex gap-1">
                        {issues.map((issue) => (
                          <span
                            key={issue}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-400"
                          >
                            {issue}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className={`font-medium ${getHealthColor(s.score)}`}>
                      {s.score}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No repositories match this filter
              </p>
            )}
            {!isFiltered && filteredSummaries.length > 20 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                +{filteredSummaries.length - 20} more repos
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
