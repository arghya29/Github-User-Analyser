import RepositoryCard from '@/components/RepositoryCard'
import type { Repository } from '@/types/github'

interface PinnedReposProps {
  repos: Repository[]
  onRepoClick: (repo: Repository) => void
}

/**
 * Renders a user's pinned repositories — the up-to-six they curated on their
 * GitHub profile — in a dedicated section above Top Repositories. Reuses
 * RepositoryCard so pinned cards behave identically to the rest (including the
 * README preview). Renders nothing when there are no pinned repos.
 */
export default function PinnedRepos({ repos, onRepoClick }: PinnedReposProps) {
  if (repos.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">📌 Pinned</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <RepositoryCard key={repo.html_url} repo={repo} onClick={() => onRepoClick(repo)} />
        ))}
      </div>
    </div>
  )
}
