import { useState, useCallback } from 'react'
import type { Repository, CodeFrequency } from '@/types/github'
import { fetchCommitActivity } from '@/lib/commitActivity'
import CommitActivityChart from '@/components/CommitActivityChart'

interface CommitActivityButtonProps {
  repo: Repository
}

export default function CommitActivityButton({ repo }: CommitActivityButtonProps) {
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
        {loading ? 'Loading...' : data ? 'Hide Commit Activity' : '📊 Commit Activity'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {data && <CommitActivityChart data={data} repoName={repo.name} />}
    </div>
  )
}
