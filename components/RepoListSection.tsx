import SortFilterBar from '@/components/SortFilterBar'
import RepositoryCard from '@/components/RepositoryCard'
import PinnedRepos from '@/components/PinnedRepos'
import EmptyState from '@/components/EmptyState'
import type { Repository, SortOption } from '@/types/github'

interface RepoListSectionProps {
  repos: Repository[]
  pinnedRepos?: Repository[]
  displayedRepos: Repository[]
  languageCounts: { name: string; count: number }[]
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  languageFilter: string[]
  onLanguagesChange: (languages: string[]) => void
  repoQuery: string
  onRepoQueryChange: (query: string) => void
  onRepoClick: (repo: Repository) => void
}

/**
 * Presentational "Repositories" section: pinned repos plus the sort/filter bar
 * and the filtered repository grid. Receives the already-filtered/sorted repo
 * list and the sort/filter state + setters; holds no state or logic itself.
 */
export default function RepoListSection({
  repos,
  pinnedRepos,
  displayedRepos,
  languageCounts,
  sortBy,
  onSortChange,
  languageFilter,
  onLanguagesChange,
  repoQuery,
  onRepoQueryChange,
  onRepoClick,
}: RepoListSectionProps) {
  return (
    <section id="repositories" className="scroll-mt-24">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Repositories
        </h2>
      </div>

      {pinnedRepos && (
        <div className="mb-8">
          <PinnedRepos repos={pinnedRepos} onRepoClick={onRepoClick} />
        </div>
      )}

      <div className="mt-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Top Repositories
        </h3>

        {repos.length > 0 ? (
          <>
            <SortFilterBar
              sortBy={sortBy}
              onSortChange={onSortChange}
              languages={languageCounts}
              activeLanguages={languageFilter}
              onLanguagesChange={onLanguagesChange}
              repoQuery={repoQuery}
              onRepoQueryChange={onRepoQueryChange}
            />
            {displayedRepos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedRepos.map((repo) => (
                  <RepositoryCard
                    key={repo.name}
                    repo={repo}
                    onSelect={onRepoClick}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                type="search"
                title="No Matches"
                message="No repositories match this filter. Try adjusting your search or clearing filters."
              />
            )}
          </>
        ) : (
          <EmptyState
            type="repositories"
            message="This user doesn't have any public repositories yet."
          />
        )}
      </div>
    </section>
  )
}
