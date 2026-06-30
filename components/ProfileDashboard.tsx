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
import PinnedRepos from '@/components/PinnedRepos'
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
  const { user, repos, contributions, engagement, productivity, pinnedRepos } = data

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
      <UserCard user={user} />

      {/* AI Insights + Export & Share — at the top for quick access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <AiInsightPanel
          user={user}
          repos={repos}
          totalContributions={contributions?.totalContributions ?? null}
          productivity={productivity}
        />
        <ExportPanel userData={{ user, repos, contributions, engagement, productivity }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <LanguageChart data={pieData} mode={usingByteData ? 'bytes' : 'count'} />
        {contributions ? (
          <ActivityHeatmap data={contributions} />
        ) : (
          <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Activity heatmap unavailable. This data requires server-side GraphQL access (a
              configured GITHUB_TOKEN) or may be temporarily unavailable.
            </p>
          </div>
        )}
      </div>

      {/* Engagement, productivity, achievements — all need the GraphQL token path */}
      {contributions !== null && engagement !== null && productivity !== null ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <EngagementStats data={engagement} />
          <ProductivityPanel data={productivity} />
          <AchievementsPanel
            totalContributions={contributions.totalContributions}
            currentStreak={productivity.currentStreak}
            totalPullRequests={engagement.totalPullRequestContributions}
          />
        </div>
      ) : (
        <div className="mt-6 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Engagement, productivity, and achievement stats require server-side GraphQL access (a
            configured GITHUB_TOKEN) or are temporarily unavailable.
          </p>
        </div>
      )}

      {/* Pinned repositories — the user's curated showcase, above Top Repositories */}
      {pinnedRepos && <PinnedRepos repos={pinnedRepos} onRepoClick={setSelectedRepo} />}

      {/* Repositories */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Top Repositories</h2>

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
