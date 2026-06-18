import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import axios, { type AxiosError } from 'axios'
import SearchBar from '@/components/SearchBar'
import SearchHistory from '@/components/SearchHistory'
import UserCard from '@/components/UserCard'
import RepositoryCard from '@/components/RepositoryCard'
import LanguageChart from '@/components/LanguageChart'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import SortFilterBar from '@/components/SortFilterBar'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EngagementStats from '@/components/EngagementStats'
import ProductivityPanel from '@/components/ProductivityPanel'
import AchievementsPanel from '@/components/AchievementsPanel'
import ThemeToggle from '@/components/ThemeToggle'
import CompareForm from '@/components/CompareForm'
import CompareResult from '@/components/CompareResult'
import RepoReadmeModal from '@/components/RepoReadmeModal'
import Footer from '@/components/Footer'
import type {
  GitHubUser,
  Repository,
  ContributionsData,
  EngagementStats as EngagementStatsType,
  ProductivityStats,
  SortOption,
  UserData,
} from '@/types/github'
import {
  aggregateLanguagesByBytes,
  aggregateLanguagesByCount,
  hasByteLanguageData,
} from '@/lib/repoStats'

const HISTORY_KEY = 'github-analyzer-history'
const MAX_HISTORY = 5

type ErrorType = 'not_found' | 'rate_limited' | 'unknown'
type Mode = 'search' | 'compare'

async function fetchUserData(username: string): Promise<UserData> {
  const response = await axios.get(`/api/github?username=${username}`)
  return response.data
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('search')

  // --- Single-user search state ---
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<Repository[]>([])
  const [contributions, setContributions] = useState<ContributionsData | null>(null)
  const [engagement, setEngagement] = useState<EngagementStatsType | null>(null)
  const [productivity, setProductivity] = useState<ProductivityStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<ErrorType | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('stars')
  const [languageFilter, setLanguageFilter] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)

  // --- Compare mode state ---
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [compareUserA, setCompareUserA] = useState<UserData | null>(null)
  const [compareUserB, setCompareUserB] = useState<UserData | null>(null)

  // Load search history once on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch {
      // localStorage unavailable (e.g. private browsing) — just skip history
    }
  }, [])

  const saveHistory = (next: string[]) => {
    setHistory(next)
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      // ignore write failures
    }
  }

  const addToHistory = (username: string) => {
    const deduped = [username, ...history.filter((h) => h.toLowerCase() !== username.toLowerCase())]
    saveHistory(deduped.slice(0, MAX_HISTORY))
  }

  const clearHistory = () => saveHistory([])

  const handleSearch = async (rawUsername: string) => {
    const username = rawUsername.trim()
    if (!username) {
      setError('Please enter a username')
      setErrorType('unknown')
      return
    }

    setLoading(true)
    setError('')
    setErrorType(null)
    setUser(null)
    setRepos([])
    setContributions(null)
    setEngagement(null)
    setProductivity(null)
    setLanguageFilter(null)
    setSelectedRepo(null)

    try {
      const data = await fetchUserData(username)

      if (data.error) {
        setError(data.error)
        setErrorType(data.errorType || 'unknown')
      } else {
        setUser(data.user)
        setRepos(data.repos)
        setContributions(data.contributions)
        setEngagement(data.engagement)
        setProductivity(data.productivity)
        addToHistory(username)
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string; errorType?: ErrorType }>
      setError(error.response?.data?.error || 'Failed to fetch user data')
      setErrorType(error.response?.data?.errorType || 'unknown')
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async (rawA: string, rawB: string) => {
    const usernameA = rawA.trim()
    const usernameB = rawB.trim()

    if (!usernameA || !usernameB) {
      setCompareError('Enter both usernames to compare')
      return
    }

    setCompareLoading(true)
    setCompareError('')
    setCompareUserA(null)
    setCompareUserB(null)

    try {
      const [dataA, dataB] = await Promise.all([fetchUserData(usernameA), fetchUserData(usernameB)])

      if (dataA.error) {
        setCompareError(`${usernameA}: ${dataA.error}`)
      } else if (dataB.error) {
        setCompareError(`${usernameB}: ${dataB.error}`)
      } else {
        setCompareUserA(dataA)
        setCompareUserB(dataB)
      }
    } catch {
      setCompareError('Failed to fetch one or both profiles')
    } finally {
      setCompareLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setErrorType(null)
    setCompareError('')
  }

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
    if (languageFilter) {
      filtered = repos.filter((repo) => repo.language === languageFilter)
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
  }, [repos, sortBy, languageFilter])

  const errorStyles: Record<ErrorType, string> = {
    not_found: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400',
    rate_limited:
      'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-500 text-amber-600 dark:text-amber-400',
    unknown: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400',
  }

  const hasExtendedData = contributions !== null && engagement !== null && productivity !== null

  return (
    <>
      <Head>
        <title>GitHub User Analyzer</title>
        <meta name="description" content="Analyze GitHub users and view their repositories" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col min-h-screen">
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="flex items-start justify-between mb-12">
              <div className="flex-1 text-center">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  GitHub User Analyzer
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Search for GitHub users and explore their profile and repositories
                </p>
              </div>
              <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
                <ThemeToggle />
              </div>
            </div>

            {/* Mode switch */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => switchMode('search')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'search'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => switchMode('compare')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'compare'
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Compare
                </button>
              </div>
            </div>

            {mode === 'search' ? (
              <>
                {/* Search Bar */}
                <SearchBar onSearch={handleSearch} loading={loading} />
                <SearchHistory history={history} onSelect={handleSearch} onClear={clearHistory} />

                {/* Error Message */}
                {error && (
                  <div
                    className={`mt-6 max-w-2xl mx-auto p-4 border rounded-lg ${errorStyles[errorType || 'unknown']}`}
                  >
                    {error}
                  </div>
                )}

                {/* Loading */}
                {loading && (
                  <div className="mt-12">
                    <LoadingSkeleton />
                  </div>
                )}

                {/* User Profile */}
                {user && !loading && (
                  <>
                    <UserCard user={user} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                      <LanguageChart data={pieData} mode={usingByteData ? 'bytes' : 'count'} />
                      {contributions ? (
                        <ActivityHeatmap data={contributions} />
                      ) : (
                        <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center text-center">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Activity heatmap unavailable. This requires a GITHUB_TOKEN to be configured on
                            the server.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Engagement, productivity, achievements — all need the GraphQL token path */}
                    {hasExtendedData ? (
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
                          Engagement, productivity, and achievement stats require a GITHUB_TOKEN to be
                          configured on the server.
                        </p>
                      </div>
                    )}

                    {/* Repositories */}
                    <div className="mt-12">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                        Top Repositories
                      </h2>

                      {repos.length > 0 ? (
                        <>
                          <SortFilterBar
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            languages={languageCounts}
                            activeLanguage={languageFilter}
                            onLanguageChange={setLanguageFilter}
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
                  </>
                )}

                {/* Initial State Message */}
                {!user && !loading && !error && (
                  <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">Search for a GitHub user to get started</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Compare mode */}
                <CompareForm onCompare={handleCompare} loading={compareLoading} />

                {compareError && (
                  <div className="mt-6 max-w-2xl mx-auto p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400">
                    {compareError}
                  </div>
                )}

                {compareLoading && (
                  <div className="mt-12 max-w-3xl mx-auto">
                    <LoadingSkeleton />
                  </div>
                )}

                {!compareLoading && compareUserA && compareUserB && (
                  <div className="mt-12">
                    <CompareResult userA={compareUserA} userB={compareUserB} />
                  </div>
                )}

                {!compareLoading && !compareUserA && !compareUserB && !compareError && (
                  <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">Enter two usernames to compare their stats side by side</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {selectedRepo && user && (
        <RepoReadmeModal repo={selectedRepo} owner={user.login} onClose={() => setSelectedRepo(null)} />
      )}
    </>
  )
}
