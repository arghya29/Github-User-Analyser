import { useState, useEffect, useCallback } from 'react'
import { fetchUserActivity } from '@/lib/activity'
import type { ActivityEvent } from '@/types/github'

interface ActivityTimelineProps {
  username: string
}

function eventIcon(type: string): string {
  switch (type) {
    case 'PushEvent':
      return '📤'
    case 'CreateEvent':
      return '✨'
    case 'DeleteEvent':
      return '🗑️'
    case 'IssuesEvent':
      return '🔧'
    case 'IssueCommentEvent':
      return '💬'
    case 'PullRequestEvent':
      return '📦'
    case 'PullRequestReviewEvent':
      return '👁️'
    case 'WatchEvent':
      return '⭐'
    case 'ForkEvent':
      return '🍴'
    case 'ReleaseEvent':
      return '🏷️'
    case 'PublicEvent':
      return '🌍'
    default:
      return '📌'
  }
}

function eventLabel(type: string): string {
  return type.replace(/([A-Z])/g, ' $1').trim()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityTimeline({ username }: ActivityTimelineProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchUserActivity(username)
      if ('error' in result) {
        setError((result as { error: string }).error)
      } else {
        setEvents(result as ActivityEvent[])
      }
    } catch {
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded w-1/3 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-full mb-3" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Recent Activity</h3>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Recent Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent public activity.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-3"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
        <span className="text-xs text-gray-400">{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>
      {!collapsed && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 text-sm">
              <span className="text-base mt-0.5 shrink-0">{eventIcon(ev.type)}</span>
              <div className="min-w-0">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{eventLabel(ev.type)}</span>
                  {' — '}
                  <a
                    href={`https://github.com/${ev.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {ev.repo}
                  </a>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(ev.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
