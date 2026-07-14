import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { fetchSponsors } from '@/lib/sponsors'
import type { SponsorInfo } from '@/types/github'

interface SponsorsDisplayProps {
  username: string
}

export default function SponsorsDisplay({ username }: SponsorsDisplayProps) {
  const [sponsors, setSponsors] = useState<SponsorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchSponsors(username)
      if (Array.isArray(result)) {
        setSponsors(result)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return null
  if (sponsors.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Sponsors ({sponsors.length})
        </h2>
        <span className="text-xs text-gray-400">{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.login}
              href={sponsor.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors"
            >
              <Image
                src={sponsor.avatarUrl}
                alt={sponsor.login}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="text-center min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-full">
                  {sponsor.login}
                </p>
                {sponsor.tierName && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {sponsor.tierName}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
