import type { UserData } from '@/types/github'

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

interface MetricRowProps {
  label: string
  a: number
  b: number
}

function MetricBar({ label, a, b }: MetricRowProps) {
  const max = Math.max(a, b, 1)
  const aWins = a > b
  const bWins = b > a

  return (
    <div className="mb-5">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">{label}</div>
      <div className="flex items-center gap-3">
        <span
          className={`w-16 text-right font-semibold ${
            aWins ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {a.toLocaleString()}
        </span>
        <div className="flex-1 flex gap-1 h-2">
          <div className="flex-1 flex justify-end">
            <div
              className={`h-2 rounded-l-full ${aWins ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'}`}
              style={{ width: `${(a / max) * 100}%` }}
            />
          </div>
          <div className="flex-1">
            <div
              className={`h-2 rounded-r-full ${bWins ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-600'}`}
              style={{ width: `${(b / max) * 100}%` }}
            />
          </div>
        </div>
        <span
          className={`w-16 font-semibold ${
            bWins ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {b.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export default function CompareResult({ userA, userB }: CompareResultProps) {
  const metrics: MetricRowProps[] = [
    { label: 'Followers', a: userA.user.followers, b: userB.user.followers },
    { label: 'Public Repos', a: userA.user.public_repos, b: userB.user.public_repos },
    { label: 'Total Stars', a: sumStars(userA.repos), b: sumStars(userB.repos) },
    { label: 'Total Forks', a: sumForks(userA.repos), b: sumForks(userB.repos) },
  ]

  if (userA.contributions && userB.contributions) {
    metrics.push({
      label: 'Contributions (last year)',
      a: userA.contributions.totalContributions,
      b: userB.contributions.totalContributions,
    })
  }

  if (userA.productivity && userB.productivity) {
    metrics.push({
      label: 'Current Streak (days)',
      a: userA.productivity.currentStreak,
      b: userB.productivity.currentStreak,
    })
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={userA.user.avatar_url}
            alt={userA.user.login}
            className="w-12 h-12 rounded-full border-2 border-blue-500 shrink-0"
          />
          <span className="font-semibold text-gray-900 dark:text-white truncate">
            @{userA.user.login}
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500 font-bold shrink-0">VS</span>
        <div className="flex items-center gap-3 min-w-0 justify-end">
          <span className="font-semibold text-gray-900 dark:text-white truncate">
            @{userB.user.login}
          </span>
          <img
            src={userB.user.avatar_url}
            alt={userB.user.login}
            className="w-12 h-12 rounded-full border-2 border-purple-500 shrink-0"
          />
        </div>
      </div>

      {metrics.map((m) => (
        <MetricBar key={m.label} label={m.label} a={m.a} b={m.b} />
      ))}
    </div>
  )
}