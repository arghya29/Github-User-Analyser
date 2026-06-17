import type { Repository } from '@/types/github'
import { getLanguageColorClass } from '@/lib/languageColors'

interface RepositoryCardProps {
  repo: Repository
}

export default function RepositoryCard({ repo }: RepositoryCardProps) {
  const lastUpdated = new Date(repo.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const langColor = getLanguageColorClass(repo.language)

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-slate-700/50 border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors hover:bg-slate-700/70"
    >
      {/* Repo Name */}
      <h3 className="text-xl font-bold text-white mb-2 hover:text-blue-400 transition-colors">
        {repo.name}
      </h3>

      {/* Description */}
      {repo.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Language */}
      {repo.language && (
        <div className="mb-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${langColor}`}></div>
          <span className="text-sm text-gray-400">{repo.language}</span>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          {repo.stargazers_count}
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H6zm0 2h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
          </svg>
          {repo.forks_count}
        </div>
        <div className="ml-auto text-xs">Updated {lastUpdated}</div>
      </div>
    </a>
  )
}
