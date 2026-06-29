import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import SearchBar from '@/components/SearchBar'
import SearchHistory from '@/components/SearchHistory'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ThemeToggle from '@/components/ThemeToggle'
import CompareForm from '@/components/CompareForm'
import CompareResult from '@/components/CompareResult'
import Footer from '@/components/Footer'
import { fetchUserData } from '@/lib/github'
import { loadHistory, clearHistory as clearStoredHistory } from '@/lib/searchHistory'
import type { UserData } from '@/types/github'

type Mode = 'search' | 'compare'

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('search')

  // --- Single-user search state (search navigates to /[username]) ---
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])

  // --- Compare mode state ---
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [compareUserA, setCompareUserA] = useState<UserData | null>(null)
  const [compareUserB, setCompareUserB] = useState<UserData | null>(null)

  // Load search history once on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const handleSearch = (rawUsername: string) => {
    const username = rawUsername.trim()
    if (!username) {
      setError('Please enter a username')
      return
    }
    setError('')
    router.push(`/${encodeURIComponent(username)}`)
  }

  const clearHistory = () => setHistory(clearStoredHistory())

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
    setCompareError('')
  }

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
                {/* Search Bar — submitting navigates to /[username] */}
                <SearchBar onSearch={handleSearch} loading={false} />
                <SearchHistory history={history} onSelect={handleSearch} onClear={clearHistory} />

                {/* Error Message (validation) */}
                {error && (
                  <div className="mt-6 max-w-2xl mx-auto p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Initial State Message */}
                {!error && (
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
    </>
  )
}
