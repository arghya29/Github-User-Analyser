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
import type { GitHubUser, Repository, ContributionsData, SortOption } from '@/types/github'

const HISTORY_KEY = 'github-analyzer-history'
const MAX_HISTORY = 5

export default function Home() {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<Repository[]>([])
  const [contributions, setContributions] = useState<ContributionsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<'not_found' | 'rate_limited' | 'unknown' | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('stars')
  const [languageFilter, setLanguageFilter] = useState<string | null>(null)

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
    setLanguageFilter(null)

    try {
      const response = await axios.get(`/api/github?username=${username}`)

      if (response.data.error) {
        setError(response.data.error)
        setErrorType(response.data.errorType || 'unknown')
      } else {
        setUser(response.data.user)
        setRepos(response.data.repos)
        setContributions(response.data.contributions)
        addToHistory(username)
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string; errorType?: 'not_found' | 'rate_limited' | 'unknown' }>
      setError(error.response?.data?.error || 'Failed to fetch user data')
      setErrorType(error.response?.data?.errorType || 'unknown')
    } finally {
      setLoading(false)
    }
  }

  // Language counts across ALL repos, used for both the pie chart and filter pills
  const languageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const repo of repos) {
      if (!repo.language) continue
      counts.set(repo.language, (counts.get(repo.language) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [repos])

  const pieData = useMemo(
    () => languageCounts.map(({ name, count }) => ({ name, value: count })),
    [languageCounts]
  )

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

  const errorStyles = {
    not_found: 'bg-red-900/20 border-red-500 text-red-400',
    rate_limited: 'bg-amber-900/20 border-amber-500 text-amber-400',
    unknown: 'bg-red-900/20 border-red-500 text-red-400',
  }

  return (
    <>
      <Head>
        <title>GitHub User Analyzer</title>
        <meta name="description" content="Analyze GitHub users and view their repositories" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-2">
              GitHub User Analyzer
            </h1>
            <p className="text-gray-300 text-lg">
              Search for GitHub users and explore their profile and repositories
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} loading={loading} />
          <SearchHistory history={history} onSelect={handleSearch} onClear={clearHistory} />

          {/* Error Message */}
          {error && (
            <div className={`mt-6 max-w-2xl mx-auto p-4 border rounded-lg ${errorStyles[errorType || 'unknown']}`}>
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
                <LanguageChart data={pieData} />
                {contributions ? (
                  <ActivityHeatmap data={contributions} />
                ) : (
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full flex items-center justify-center text-center">
                    <p className="text-gray-400 text-sm">
                      Activity heatmap unavailable. This requires a GITHUB_TOKEN to be configured on the server.
                    </p>
                  </div>
                )}
              </div>

              {/* Repositories */}
              <div className="mt-12">
                <h2 className="text-3xl font-bold text-white mb-6">
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
                          <RepositoryCard key={repo.name} repo={repo} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No repositories match this filter</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400">No repositories found</p>
                )}
              </div>
            </>
          )}

          {/* Initial State Message */}
          {!user && !loading && !error && (
            <div className="text-center mt-12 text-gray-400">
              <p className="text-lg">Search for a GitHub user to get started</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
