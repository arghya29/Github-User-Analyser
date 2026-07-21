import dynamic from 'next/dynamic'
import ChartSkeleton from '@/components/charts/ChartSkeleton'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import { useState, useCallback } from 'react'
import type { Repository, CodeFrequency } from '@/types/github'
import { fetchCommitActivity } from '@/lib/commitActivity'
// Only rendered once the user opens the commit activity, so its recharts bundle
// should not be paid for on page load.
// `ssr: false` is safe here rather than a behaviour change: the dashboard only
// renders after the client-side profile fetch resolves, so this never rendered
// on the server to begin with.
const CommitActivityChart = dynamic(
  () => import('@/components/CommitActivityChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

interface CommitActivityButtonProps {
  repo: Repository
}

export default function CommitActivityButton({
  repo,
}: CommitActivityButtonProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CodeFrequency[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (data) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const owner = repo.owner_login || repo.html_url.split('/')[3]
      const result = await fetchCommitActivity(owner, repo.name)
      if ('error' in result) {
        setError((result as { error: string }).error)
      } else {
        setData(result as CodeFrequency[])
      }
    } catch {
      setError('Failed to load commit activity')
    } finally {
      setLoading(false)
    }
  }, [repo, data])

  return (
    <div>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="w-full text-sm font-medium px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
      >
        {loading
          ? 'Loading...'
          : data
            ? 'Hide Commit Activity'
            : '📊 Commit Activity'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {data && (
        // The chart is a lazily-fetched chunk now, so a failed chunk load throws during
        // render — which the try/catch around the data fetch above cannot catch. Guard it
        // with the same boundary TechStackSection already uses for its chart.
        <ErrorBoundary fallback={ErrorFallback}>
          <CommitActivityChart data={data} repoName={repo.name} />
        </ErrorBoundary>
      )}
    </div>
  )
}
