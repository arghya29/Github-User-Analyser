import { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { resolveBaseUrl } from '@/lib/siteUrl'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import type { AxiosError } from 'axios'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Footer from '@/components/Footer'
import ProfileDashboard from '@/components/ProfileDashboard'
import { fetchUserData } from '@/lib/github'
import { recordSearch } from '@/lib/searchHistory'
import type { UserData } from '@/types/github'

type ErrorType = 'not_found' | 'rate_limited' | 'unknown'

const errorStyles: Record<ErrorType, string> = {
  not_found:
    'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400',
  rate_limited:
    'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-500 text-amber-600 dark:text-amber-400',
  unknown:
    'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400',
}

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
        setError(axiosError.response?.data?.error || 'Failed to fetch user data')
        setErrorType(axiosError.response?.data?.errorType || 'unknown')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router.isReady, username])

  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta name="description" content={og.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="GitHub User Analyzer" />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GitHub User Analyzer" />
        <meta property="og:url" content={og.url} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
      </Head>

      <div className="flex flex-col min-h-screen">
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                className="text-xl font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
              >
                GitHub User Analyzer
              </Link>
              <ThemeToggle />
            </div>

            {loading && (
              <div className="mt-12">
                <LoadingSkeleton />
              </div>
            )}

            {!loading && error && (
              <div
                className={`mt-6 max-w-2xl mx-auto p-4 border rounded-lg ${errorStyles[errorType]}`}
              >
                {error}
              </div>
            )}

            {!loading && data && <ProfileDashboard data={data} />}
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
  const title = username ? `${username} · GitHub User Analyzer` : 'GitHub User Analyzer'
  const description = username
    ? `Explore @${username}'s repositories, top languages, and contribution activity on GitHub User Analyzer.`
    : 'Analyze GitHub users and view their repositories'

  const og: OgMeta = {
    title,
    description,
    url: baseUrl ? `${baseUrl}/${encodeURIComponent(username)}` : `/${username}`,
    image: baseUrl ? `${baseUrl}/og-default.png` : '/og-default.png',
  }

  return { props: { og } }
}
