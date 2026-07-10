import { useMemo, useState, useEffect } from 'react'
import UserCard from '@/components/UserCard'
import RepositoryCard from '@/components/RepositoryCard'
import LanguageChart from '@/components/LanguageChart'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import SortFilterBar from '@/components/SortFilterBar'
import EngagementStats from '@/components/EngagementStats'
import ProductivityPanel from '@/components/ProductivityPanel'
import AchievementsPanel from '@/components/AchievementsPanel'
import AiInsightPanel from '@/components/AiInsightPanel'
import ExportPanel from '@/components/ExportPanel'
import RepoReadmeModal from '@/components/RepoReadmeModal'
import RateLimitBadge from '@/components/RateLimitBadge'
import PinnedRepos from '@/components/PinnedRepos'
import ActivityTimeline from '@/components/ActivityTimeline'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import SponsorsDisplay from '@/components/SponsorsDisplay'
import RepoHealthDashboard from '@/components/RepoHealthDashboard'
import LanguageDashboard from '@/components/LanguageDashboard'
import type { Repository, SortOption, UserData } from '@/types/github'
import {
  aggregateLanguagesByBytes,
  aggregateLanguagesByCount,
  hasByteLanguageData,
} from '@/lib/repoStats'

interface ProfileDashboardProps {
  data: UserData
}

/**
 * Renders a single user's full dashboard (profile card, AI insights, charts,
 * engagement/productivity/achievements, and repositories). Owns the repo
 * sort/filter and README-modal state. Shared by the home page and the
 * /[username] route so both render identically.
 */
export default function ProfileDashboard({ data }: ProfileDashboardProps) {
  const { user, repos, contributions, engagement, productivity, pinnedRepos, rateLimit } = data

  const [sortBy, setSortBy] = useState<SortOption>('stars')
  const [languageFilter, setLanguageFilter] = useState<string[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [repoQuery, setRepoQuery] = useState('')

  // Clear the repo name search when navigating to a different profile.
  useEffect(() => {
    setRepoQuery('')
  }, [user.login])

  // Language counts across ALL repos — always available, used for filter pills
  const languageCounts = useMemo(() => aggregateLanguagesByCount(repos), [repos])

  // Byte-accurate distribution when available (GraphQL path), otherwise fall
  // back to repo-count based percentages so the chart still renders.
  const byteDistribution = useMemo(() => aggregateLanguagesByBytes(repos), [repos])
  const usingByteData = useMemo(() => hasByteLanguageData(repos), [repos])

  const pieData = useMemo(() => {
    if (usingByteData) return byteDistribution
    return languageCounts.map(({ name, count }) => ({ name, value: count }))
  }, [usingByteData, byteDistribution, languageCounts])

  const displayedRepos = useMemo(() => {
    let filtered = repos
    if (languageFilter.length > 0) {
      filtered = repos.filter((repo) => repo.language && languageFilter.includes(repo.language))
    }

    const q = repoQuery.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((repo) => repo.name.toLowerCase().includes(q))
    }

    const sorted = [...filtered]
    if (sortBy === 'stars') {
      sorted.sort((a, b) => b.stargazers_count - a.stargazers_count)
    } else if (sortBy === 'forks') {
      sorted.sort((a, b) => b.forks_count - a.forks_count)
    } else {
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    return sorted
  }, [repos, sortBy, languageFilter, repoQuery])

  return (
    <>
      {/* Fixed-height slot so the badge appearing/disappearing never shifts the
          dashboard layout. */}
      <div className="flex justify-end mb-0 min-h-[1.75rem]">
        {rateLimit && <RateLimitBadge rateLimit={rateLimit} />}
      </div>
      <div className="space-y-12">
        <section id="profile" className="scroll-mt-24">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6">
            <div className="space-y-6">
              <UserCard user={user} />
              <SponsorsDisplay username={user.login} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <ErrorBoundary fallback={ErrorFallback}>
                <AiInsightPanel
                  user={user}
                  repos={repos}
                  totalContributions={contributions?.totalContributions ?? null}
                  productivity={productivity}
                />
              </ErrorBoundary>

              <ErrorBoundary fallback={ErrorFallback}>
                <ExportPanel userData={{ user, repos, contributions, engagement, productivity }} />
              </ErrorBoundary>
            </div>
          </div>

          {contributions !== null && engagement !== null && productivity !== null ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <ErrorBoundary fallback={ErrorFallback}>
                <EngagementStats data={engagement} />
              </ErrorBoundary>
              <ErrorBoundary fallback={ErrorFallback}>
                <ProductivityPanel data={productivity} />
              </ErrorBoundary>
              <ErrorBoundary fallback={ErrorFallback}>
                <AchievementsPanel
                  totalContributions={contributions.totalContributions}
                  currentStreak={productivity.currentStreak}
                  totalPullRequests={engagement.totalPullRequestContributions}
                />
              </ErrorBoundary>
            </div>
          ) : (
            <div className="mt-6 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Engagement, productivity, and achievement stats require server-side GraphQL access (a
                configured GITHUB_TOKEN) or are temporarily unavailable.
              </p>
            </div>
          )}
        </section>

        <section id="activity" className="scroll-mt-24">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {contributions ? (
              <ErrorBoundary fallback={ErrorFallback}>
                <ActivityHeatmap data={contributions} />
              </ErrorBoundary>
            ) : (
              <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Activity heatmap unavailable. This data requires server-side GraphQL access (a
                  configured GITHUB_TOKEN) or may be temporarily unavailable.
                </p>
              </div>
            )}

            <ErrorBoundary fallback={ErrorFallback}>
              <ActivityTimeline username={user.login} />
            </ErrorBoundary>
          </div>
        </section>

        <section id="techstack" className="scroll-mt-24">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Techstack</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary fallback={ErrorFallback}>
              <LanguageChart data={pieData} mode={usingByteData ? 'bytes' : 'count'} />
            </ErrorBoundary>
            <ErrorBoundary fallback={ErrorFallback}>
              <LanguageDashboard repos={repos} />
            </ErrorBoundary>
          </div>
        </section>

        <section id="repo-health" className="scroll-mt-24">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repo Health</h2>
          </div>

          <ErrorBoundary fallback={ErrorFallback}>
            <RepoHealthDashboard repos={repos} />
          </ErrorBoundary>
        </section>

        <section id="repositories" className="scroll-mt-24">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repositories</h2>
          </div>

          {pinnedRepos && (
            <div className="mb-8">
              <PinnedRepos repos={pinnedRepos} onRepoClick={setSelectedRepo} />
            </div>
          )}

          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Top Repositories</h3>

            {repos.length > 0 ? (
              <>
                <SortFilterBar
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  languages={languageCounts}
                  activeLanguages={languageFilter}
                  onLanguagesChange={setLanguageFilter}
                  repoQuery={repoQuery}
                  onRepoQueryChange={setRepoQuery}
                />
                {displayedRepos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedRepos.map((repo) => (
                      <RepositoryCard
                        key={repo.name}
                        repo={repo}
                        onClick={() => setSelectedRepo(repo)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No repositories match this filter</p>
                )}
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No repositories found</p>
            )}
          </div>
        </section>
      </div>

      {selectedRepo && (
        <RepoReadmeModal
          repo={selectedRepo}
          owner={selectedRepo.owner_login ?? user.login}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  )
}
