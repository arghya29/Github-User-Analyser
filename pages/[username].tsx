import { useCallback, useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { resolveBaseUrl } from '@/lib/siteUrl'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import type { AxiosError } from 'axios'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Footer from '@/components/Footer'
import MobileNav from '@/components/MobileNav'
import ProfileDashboard from '@/components/ProfileDashboard'
import RateLimitBanner from '@/components/RateLimitBanner'
import ErrorState, { type ErrorType } from '@/components/ErrorState'
import { fetchUserData } from '@/lib/github'
import { recordSearch } from '@/lib/searchHistory'
import type { UserData } from '@/types/github'

interface OgMeta {
  title: string
  description: string
  url: string
  image: string
}

interface UserProfilePageProps {
  og: OgMeta
}

export default function UserProfilePage({ og }: UserProfilePageProps) {
  const router = useRouter()
  const usernameParam = router.query.username
  const username = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam

  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<ErrorType>('unknown')
  const [retryCount, setRetryCount] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    if (!username) {
      setLoading(false)
      setError('No username provided')
      setErrorType('not_found')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setData(null)

    fetchUserData(username)
      .then((result) => {
        if (cancelled) return
        if (result.error) {
          setError(result.error)
          setErrorType(result.errorType || 'unknown')
        } else {
          setData(result)
          recordSearch(username)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const axiosError = err as AxiosError<{ error: string; errorType?: ErrorType }>
        if (axiosError.response) {
          // The server responded with an error payload.
          setError(axiosError.response.data?.error || 'Failed to fetch user data')
          setErrorType(axiosError.response.data?.errorType || 'unknown')
        } else {
          // No response at all → a connectivity/network failure.
          setError('We couldn’t reach GitHub. Check your internet connection and try again.')
          setErrorType('network')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router.isReady, username, retryCount])

  const handleRetry = useCallback(() => setRetryCount((count) => count + 1), [])

  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta name="description" content={og.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="GitHub User Analyser" />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GitHub User Analyser" />
        <meta property="og:url" content={og.url} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
      </Head>

      <div className="flex flex-col min-h-screen">
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 pt-0 pb-12">
            {/* Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-b border-gray-200/80 dark:border-slate-800/80 py-4 mb-0 -mx-4">
              <div className="flex flex-nowrap items-center justify-between gap-2 w-full px-2 md:px-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors md:hidden"
                    aria-label="Open navigation menu"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors md:hidden"
                      aria-label="Home"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5.25a.75.75 0 01-.75-.75V15.5a.75.75 0 00-.75-.75H10.5a.75.75 0 00-.75.75v5.75a.75.75 0 01-.75.75H3a1 1 0 01-1-1V9.75z" />
                      </svg>
                    </Link>
                    <Link
                      href="/"
                      className="min-w-0 text-lg md:text-xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity truncate"
                    >
                      GitHub User Analyser
                    </Link>
                    <Link
                      href="/"
                      className="hidden md:inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold text-gray-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5.25a.75.75 0 01-.75-.75V15.5a.75.75 0 00-.75-.75H10.5a.75.75 0 00-.75.75v5.75a.75.75 0 01-.75.75H3a1 1 0 01-1-1V9.75z" />
                      </svg>
                      Home
                    </Link>
                  </div>
                </div>

                <nav className="hidden md:flex flex-wrap items-center gap-4 text-base font-semibold text-gray-700 dark:text-gray-300">
                  <a href="#profile" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Profile
                  </a>
                  <a href="#activity" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Activity
                  </a>
                  <a href="#techstack" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Techstack
                  </a>
                  <a href="#repo-health" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Repo Health
                  </a>
                  <a href="#repositories" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Repositories
                  </a>
                </nav>

                <ThemeToggle />
              </div>
            </div>

            <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            {loading && (
              <div className="mt-12">
                <LoadingSkeleton />
              </div>
            )}

            {!loading && error && (
              errorType === 'rate_limited' ? (
                <RateLimitBanner
                  resetAt={data?.rateLimit?.resetAt}
                  onRetry={handleRetry}
                />
              ) : (
                <ErrorState
                  errorType={errorType}
                  message={error}
                  onRetry={errorType === 'not_found' ? undefined : handleRetry}
                />
              )
            )}

            {!loading && data && (
              <>
                {/* Dynamic OG tags for rich sharing when data is available */}
                <Head>
                  <meta property="og:title" content={`${data.user.name || data.user.login} · GitHub User Analyser`} />
                  <meta property="og:description" content={data.user.bio ? `${data.user.bio.slice(0, 120)} — Analyze GitHub profiles.` : `Explore @${data.user.login}'s ${data.repos.length} repositories and contribution activity.`} />
                  <meta property="og:image" content={data.user.avatar_url} />
                  <meta name="twitter:title" content={`${data.user.name || data.user.login} · GitHub User Analyser`} />
                  <meta name="twitter:description" content={data.user.bio ? `${data.user.bio.slice(0, 120)} — Analyze GitHub profiles.` : `Explore @${data.user.login}'s repositories.`} />
                  <meta name="twitter:image" content={data.user.avatar_url} />
                </Head>
                <ProfileDashboard data={data} />
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<UserProfilePageProps> = async ({
  params,
  req,
}) => {
  const raw = params?.username
  const username = (Array.isArray(raw) ? raw[0] : raw) ?? ''

  const baseUrl = resolveBaseUrl(req)

  // Per-profile tags are derived from the login (already in the route), so the
  // page renders with no extra latency. The static default image is shared.
  const title = username ? `${username} · GitHub User Analyser` : 'GitHub User Analyser'
  const description = username
    ? `Explore @${username}'s repositories, top languages, and contribution activity on GitHub User Analyser.`
    : 'Analyze GitHub users and view their repositories'

  const og: OgMeta = {
    title,
    description,
    url: baseUrl ? `${baseUrl}/${encodeURIComponent(username)}` : `/${username}`,
    image: baseUrl ? `${baseUrl}/og-default.png` : '/og-default.png',
  }

  return { props: { og } }
}
