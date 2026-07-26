interface FavoritesProps {
  favorites: string[];
  onSelect: (username: string) => void;
  onRemove: (username: string) => void;
}

export default function Favorites({
  favorites,
  onSelect,
  onRemove,
}: FavoritesProps) {
  if (favorites.length === 0) return null;

  return (
    <div
      className="max-w-2xl mx-auto mt-1 flex items-center gap-2 flex-wrap"
      role="region"
      aria-label="Favorite profiles"
    >
      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
        ★ Favorites:
      </span>
      <ul className="flex flex-wrap gap-2" role="list">
        {favorites.map((username) => (
          <li
            key={username}
            className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 rounded-full"
          >
            <button
              onClick={() => onSelect(username)}
              className="pl-3 pr-1.5 py-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 rounded-l-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {username}
            </button>
            <button
              onClick={() => onRemove(username)}
              aria-label={`Remove ${username} from favorites`}
              className="pr-2.5 pl-0.5 py-1 text-xs leading-none text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 rounded-r-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
