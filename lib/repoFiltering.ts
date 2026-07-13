import type { Repository, SortOption } from '@/types/github'

/**
 * Pure filter + sort used by the repository list: narrows by active languages
 * and a name query, then sorts by the chosen option. Extracted from
 * ProfileDashboard so the transformation can be unit-tested in isolation.
 * Does not mutate the input array.
 */
export function filterAndSortRepos(
  repos: Repository[],
  sortBy: SortOption,
  languageFilter: string[],
  repoQuery: string
): Repository[] {
  let filtered = repos
  if (languageFilter.length > 0) {
    filtered = repos.filter((repo) => repo.language && languageFilter.includes(repo.language))
  }

  const q = repoQuery.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter((repo) => repo.name.toLowerCase().includes(q))
  }

  const sorted = [...filtered]
  if (sortBy === 'stars') {
    sorted.sort((a, b) => b.stargazers_count - a.stargazers_count)
  } else if (sortBy === 'forks') {
    sorted.sort((a, b) => b.forks_count - a.forks_count)
  } else {
    sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
  return sorted
}
