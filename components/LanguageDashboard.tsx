import { useMemo, useState } from 'react'
import type { Repository } from '@/types/github'
import { computeLanguageDashboardStats, getRepoLanguageBreakdown } from '@/lib/languageDashboard'

interface LanguageDashboardProps {
  repos: Repository[]
}

export default function LanguageDashboard({ repos }: LanguageDashboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedLang, setSelectedLang] = useState<string | null>(null)

  const stats = useMemo(() => computeLanguageDashboardStats(repos), [repos])

  const filteredRepos = useMemo(() => {
    if (!selectedLang) return repos.slice(0, 10)
    return repos
      .filter((r) => r.language === selectedLang || r.languages?.some((l) => l.name === selectedLang))
      .slice(0, 10)
  }, [repos, selectedLang])

  if (!repos.length) return null

  const maxCount = Math.max(...stats.languageRepoTotals.map((l) => l.count), 1)

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Language Dashboard</h2>
        <span className="text-xs text-gray-400">{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>

      {!collapsed && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.languageCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Languages Used</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.primaryLanguage || 'N/A'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Primary Language</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.mostVersatileRepo?.langCount || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max Languages/Repo</div>
            </div>
            <div className="bg-gray-100 dark:bg-slate-600/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.mostVersatileRepo?.name ? (
                  <span className="text-sm">{stats.mostVersatileRepo.name}</span>
                ) : 'N/A'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Most Versatile Repo</div>
            </div>
          </div>

          {/* Language bars */}
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Languages by Repo Count</h3>
            {stats.languageRepoTotals.map((lang) => (
              <button
                key={lang.name}
                type="button"
                onClick={() => setSelectedLang(selectedLang === lang.name ? null : lang.name)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-600/50 ${
                  selectedLang === lang.name ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 text-left">{lang.name}</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(lang.count / maxCount) * 100}%`, backgroundColor: lang.color }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{lang.count}</span>
              </button>
            ))}
          </div>

          {/* Repos using selected language */}
          {selectedLang && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Repos using <span style={{ color: stats.languageRepoTotals.find((l) => l.name === selectedLang)?.color }}>{selectedLang}</span>
              </h3>
              <div className="space-y-1">
                {filteredRepos.map((repo) => {
                  const breakdown = getRepoLanguageBreakdown(repo)
                  const langInfo = breakdown.find((l) => l.name === selectedLang)
                  return (
                    <div
                      key={repo.name}
                      className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-600/50"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{repo.name}</span>
                      {langInfo && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {langInfo.percentage}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
