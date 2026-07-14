import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import { resolveBaseUrl } from '@/lib/siteUrl'
import Head from 'next/head'
import SearchBar from '@/components/SearchBar'
import SearchHistory from '@/components/SearchHistory'
import Favorites from '@/components/Favorites'
import ThemeToggle from '@/components/ThemeToggle'
import CompareForm from '@/components/CompareForm'
import Footer from '@/components/Footer'
import { loadHistory, clearHistory as clearStoredHistory } from '@/lib/searchHistory'
import { getFavorites, removeFavorite } from '@/lib/favorites'

type Mode = 'search' | 'compare'

const SITE_DESCRIPTION = 'Analyze GitHub users and view their repositories'

interface HomePageProps {
  baseUrl: string
}

export default function Home({ baseUrl }: HomePageProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('search')

  // --- Single-user search state (search navigates to /[username]) ---
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  // --- Compare mode state ---
  // The results themselves now live on /compare, which reads the pair from the URL. All the home
  // page needs is the message for a submission it can't turn into a URL, plus a flag while the
  // navigation is in flight.
  const [compareNavigating, setCompareNavigating] = useState(false)
  const [compareError, setCompareError] = useState('')

  // Load search history once on mount
  useEffect(() => {
    setHistory(loadHistory())
    setFavorites(getFavorites())
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
  const handleRemoveFavorite = (username: string) => setFavorites(removeFavorite(username))

  const handleCompare = async (rawA: string, rawB: string) => {
    const usernameA = rawA.trim()
    const usernameB = rawB.trim()

    if (!usernameA || !usernameB) {
      setCompareError('Enter both usernames to compare')
      return
    }

    setCompareError('')
    setCompareNavigating(true)

    // A comparison is now a place, not a piece of state. Everything the result page needs lives in
    // the URL, which is what makes it refreshable, bookmarkable and shareable — and it leaves the
    // home page clean once you've run one.
    //
    // No fetching here: /compare fetches from the query string, so the pair on screen always
    // matches the pair in the address bar.
    try {
      await router.push({
        pathname: '/compare',
        query: { user1: usernameA, user2: usernameB },
      })
    } catch {
      setCompareError('Could not open the comparison page')
    } finally {
      setCompareNavigating(false)
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
        <title>GitHub User Analyser</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GitHub User Analyser" />
        <meta property="og:title" content="GitHub User Analyser" />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={baseUrl ? `${baseUrl}/og-default.png` : '/og-default.png'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GitHub User Analyser" />
        <meta property="og:url" content={baseUrl || '/'} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GitHub User Analyser" />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={baseUrl ? `${baseUrl}/og-default.png` : '/og-default.png'} />
      </Head>

      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <main className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#020617,#0f172a)]">
          <div className="mx-auto max-w-6xl px-4 pt-0 lg:pt-4 pb-10 sm:pb-12 lg:pb-16">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-300/20">
                  <span className="text-xl font-semibold">GH</span>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-semibold text-cyan-700 dark:text-cyan-300">GitHub User Analyser</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div className="space-y-10">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.25fr] lg:items-start">
                <div className="space-y-4 max-w-lg">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-800 dark:text-cyan-300">GitHub insights made simple</p>
                  <p className="text-slate-800 dark:text-slate-300 text-base sm:text-lg">
                    Quickly inspect public profiles and compare two users with a clean, modern interface.
                  </p>
                </div>

                <div className="relative rounded-[2rem] border border-slate-200/20 bg-white/90 pt-5 pb-6 px-8 shadow-2xl shadow-slate-900/5 min-h-[280px] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-slate-950/30">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{mode === 'search' ? 'Search' : 'Compare'}</p>
                    <div className="inline-flex rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700 dark:bg-white/5 dark:text-slate-300">
                      {mode === 'search' ? 'Search' : 'Compare'}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white whitespace-nowrap sm:whitespace-normal">
                      {mode === 'search'
                        ? 'Analyse\u00A0GitHub profile'
                        : 'Compare\u00A0GitHub profiles'}
                    </h2>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => switchMode('search')}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                        mode === 'search'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      Search
                    </button>
                    <button
                      onClick={() => switchMode('compare')}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                        mode === 'compare'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      Compare
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mode === 'search' ? (
                      <>
                        <SearchBar onSearch={handleSearch} loading={false} />
                        <SearchHistory history={history} onSelect={handleSearch} onClear={clearHistory} />
                        <Favorites favorites={favorites} onSelect={handleSearch} onRemove={handleRemoveFavorite} />
                        {error && <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>}
                      </>
                    ) : (
                      <>
                        <CompareForm onCompare={handleCompare} loading={compareNavigating} />

                        {compareError && (
                          <div role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                            {compareError}
                          </div>
                        )}

                        <div className="text-slate-600 dark:text-slate-300">Add two usernames to compare their public GitHub stats.</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-10">
              <section className="space-y-6 max-w-3xl">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">What makes this app useful?</h2>
                  <p className="mt-3 text-slate-600 dark:text-slate-400 text-base leading-7">
                    GitHub User Analyser helps you find profiles quickly, understand key repository metrics, and compare two developers side by side with instant clarity.
                  </p>
                </div>

                <div className="space-y-5 text-slate-700 dark:text-slate-300">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Fast profile search</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm leading-6">
                      Type in any GitHub username and get immediate access to public profile data, repository trends, and activity signals in one clean view.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Smart comparison mode</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm leading-6">
                      Compare two users side by side to spot strengths, repo health, and contribution patterns without switching between tabs.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Clear insights</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm leading-6">
                      Explore follower growth, languages, and repo activity with simple visuals and concise summaries tailored for developers and recruiters.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ req }) => {
  return { props: { baseUrl: resolveBaseUrl(req) } }
}
