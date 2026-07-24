import type { UserData } from '@/types/github'

interface CompareScoreCardProps {
  userA: UserData
  userB: UserData
}

export default function CompareScoreCard({ userA, userB }: CompareScoreCardProps) {
  const starsA = userA.repos.reduce((sum, r) => sum + r.stargazers_count, 0)
  const starsB = userB.repos.reduce((sum, r) => sum + r.stargazers_count, 0)

  const followersA = userA.user.followers
  const followersB = userB.user.followers

  const reposA = userA.user.public_repos
  const reposB = userB.user.public_repos

  const contribsA = userA.contributions?.totalContributions || 0
  const contribsB = userB.contributions?.totalContributions || 0

  let scoreA = 0
  let scoreB = 0

  if (starsA > starsB) scoreA += 2
  else if (starsB > starsA) scoreB += 2

  if (followersA > followersB) scoreA += 1.5
  else if (followersB > followersA) scoreB += 1.5

  if (reposA > reposB) scoreA += 1
  else if (reposB > reposA) scoreB += 1

  if (contribsA > contribsB) scoreA += 2.5
  else if (contribsB > contribsA) scoreB += 2.5

  const compatibility = Math.min(
    100,
    Math.round(100 - Math.abs(scoreA - scoreB) * 10 - Math.abs(followersA - followersB) * 0.05),
  )

  const displayCompatibility = compatibility < 20 ? 25 : compatibility

  return (
    <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 rounded-2xl shadow-sm text-center">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
        Developer Analytics Insights
      </h4>
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Score @{userA.user.login}</div>
          <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {scoreA.toFixed(1)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-3 rounded-xl">
          <div className="text-xs text-gray-400 dark:text-gray-400">Activity Compatibility</div>
          <div className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-0.5">
            {displayCompatibility}% Matching
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Score @{userB.user.login}</div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {scoreB.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  )
}
