import { useState, useCallback } from 'react'
import type { Repository, StarEntry } from '@/types/github'
import { fetchStarHistory } from '@/lib/starHistory'
import StarHistoryChart from '@/components/StarHistoryChart'

interface StarHistoryButtonProps {
  repo: Repository
}

export default function StarHistoryButton({ repo }: StarHistoryButtonProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StarEntry[] | null>(null)
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
      const result = await fetchStarHistory(owner, repo.name)
      if ('error' in result) {
        setError((result as { error: string }).error)
      } else {
        setData(result as StarEntry[])
      }
    } catch {
      setError('Failed to load star history')
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
        className="w-full text-sm font-medium px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : data ? 'Hide Star History' : '⭐ Star History'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {data && <StarHistoryChart data={data} repoName={repo.name} />}
    </div>
  )
}
