import Image from 'next/image'
import type { UserData } from '@/types/github'
import { summarizeReposHealth } from '@/lib/repoHealth'
import CompareScoreCard from './CompareScoreCard'
import CompareLanguages from './CompareLanguages'

interface CompareResultProps {
  userA: UserData
  userB: UserData
}

function sumStars(repos: UserData['repos']): number {
  return repos.reduce((sum, r) => sum + r.stargazers_count, 0)
}

function sumForks(repos: UserData['repos']): number {
  return repos.reduce((sum, r) => sum + r.forks_count, 0)
}

/** Mean repository health score across a user's repos (0 when they have none). */
function avgHealthScore(repos: UserData['repos']): number {
  const summaries = summarizeReposHealth(repos)
  if (summaries.length === 0) return 0
  const total = summaries.reduce((sum, s) => sum + s.score, 0)
  return Math.round(total / summaries.length)
}

interface MetricRowProps {
  label: string
  a: number | null
  b: number | null
}

function MetricBar({ label, a, b }: MetricRowProps) {
  const aVal = a ?? 0
  const bVal = b ?? 0
  const max = Math.max(aVal, bVal, 1)
  // Only declare a "winner" when both sides have a comparable value.
  const comparable = a !== null && b !== null
  const aWins = comparable && aVal > bVal
  const bWins = comparable && bVal > aVal

  return (
    <div className="mb-5">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`w-16 text-right font-semibold ${
            aWins
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {a === null ? 'N/A' : a.toLocaleString()}
        </span>
        <div className="flex-1 flex gap-1 h-2">
          <div className="flex-1 flex justify-end">
            <div
              className={`h-2 rounded-l-full ${aWins ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'}`}
              style={{ width: `${(aVal / max) * 100}%` }}
            />
          </div>
          <div className="flex-1">
            <div
              className={`h-2 rounded-r-full ${bWins ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
              style={{ width: `${(bVal / max) * 100}%` }}
            />
          </div>
        </div>
        <span
          className={`w-16 font-semibold ${
            bWins
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {b === null ? 'N/A' : b.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export default function CompareResult({ userA, userB }: CompareResultProps) {
  const metrics: MetricRowProps[] = [
    { label: 'Followers', a: userA.user.followers, b: userB.user.followers },
    {
      label: 'Public Repos',
      a: userA.user.public_repos,
      b: userB.user.public_repos,
    },
    {
      label: 'Total Stars',
      a: sumStars(userA.repos),
      b: sumStars(userB.repos),
    },
    {
      label: 'Total Forks',
      a: sumForks(userA.repos),
      b: sumForks(userB.repos),
    },
    {
      label: 'Avg Repo Health',
      a: avgHealthScore(userA.repos),
      b: avgHealthScore(userB.repos),
    },
  ]

  // Contribution/productivity metrics can be null for users without server-side
  // rich data (e.g. no configured token — see #189). Show a metric when at least
  // one user has it, rendering the other side as N/A rather than hiding or crashing.
  const addMetric = (label: string, a: number | null, b: number | null) => {
    if (a !== null || b !== null) metrics.push({ label, a, b })
  }

  addMetric(
    'Contributions (last year)',
    userA.contributions?.totalContributions ?? null,
    userB.contributions?.totalContributions ?? null
  )
  addMetric(
    'Current Streak (days)',
    userA.productivity?.currentStreak ?? null,
    userB.productivity?.currentStreak ?? null
  )
  addMetric(
    'Longest Streak (days)',
    userA.productivity?.longestStreak ?? null,
    userB.productivity?.longestStreak ?? null
  )
  addMetric(
    'Most Productive Day',
    userA.productivity?.mostProductiveDay?.count ?? null,
    userB.productivity?.mostProductiveDay?.count ?? null
  )

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto justify-center sm:justify-start">
          <Image
            src={userA.user.avatar_url}
            alt={userA.user.login}
            width={48}
            height={48}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-blue-500 shrink-0 object-cover"
          />
          <span className="font-semibold text-gray-900 dark:text-white truncate">
            @{userA.user.login}
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500 font-bold shrink-0">
          VS
        </span>
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto justify-center sm:justify-end">
          <span className="font-semibold text-gray-900 dark:text-white truncate">
            @{userB.user.login}
          </span>
          <Image
            src={userB.user.avatar_url}
            alt={userB.user.login}
            width={48}
            height={48}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-purple-500 shrink-0 object-cover"
          />
        </div>
      </div>

      {metrics.map((m) => (
        <MetricBar key={m.label} label={m.label} a={m.a} b={m.b} />
      ))}

      <CompareLanguages userA={userA} userB={userB} />

      <CompareScoreCard userA={userA} userB={userB} />
    </div>
  )
}
