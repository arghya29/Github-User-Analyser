import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { fetchFollowersOrFollowing } from '@/lib/followers'
import type { FollowerUser } from '@/types/github'

interface FollowersExplorerProps {
  username: string
  followersCount: number
  followingCount: number
  onClose: () => void
}

export default function FollowersExplorer({
  username,
  followersCount,
  followingCount,
  onClose,
}: FollowersExplorerProps) {
  const [tab, setTab] = useState<'followers' | 'following'>('followers')
  const [users, setUsers] = useState<FollowerUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFollowersOrFollowing(username, tab)
      if ('error' in result) {
        setError((result as { error: string }).error)
      } else {
        setUsers(result as FollowerUser[])
      }
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [username, tab])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Followers and following"
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-600 shrink-0">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'followers'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setTab('followers')}
          >
            Followers ({followersCount})
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'following'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setTab('following')}
          >
            Following ({followingCount})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users found.</p>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="space-y-2">
              {users.map((u) => (
                <a
                  key={u.login}
                  href={u.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Image
                    src={u.avatarUrl}
                    alt={u.login}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.login}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.type}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Close */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-600 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
