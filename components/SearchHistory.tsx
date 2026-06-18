interface SearchHistoryProps {
  history: string[]
  onSelect: (username: string) => void
  onClear: () => void
}

export default function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto mt-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 dark:text-gray-500">Recent:</span>
      {history.map((username) => (
        <button
          key={username}
          onClick={() => onSelect(username)}
          className="px-3 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-full transition-colors"
        >
          {username}
        </button>
      ))}
      <button
        onClick={onClear}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline ml-1"
      >
        Clear
      </button>
    </div>
  )
}