interface SearchHistoryProps {
  history: string[]
  onSelect: (username: string) => void
  onClear: () => void
}

export default function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto mt-1 flex items-center gap-2 flex-wrap" role="region" aria-label="Search History">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recent:</span>
      <ul className="flex flex-wrap gap-2" role="list">
        {history.map((username) => (
          <li key={username}>
            <button
              onClick={() => onSelect(username)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {username}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={onClear}
        className="text-xs text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:underline ml-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
      >
        Clear
      </button>
    </div>
  )
}