import { useEffect, useState } from "react";
import { isFavorite, addFavorite, removeFavorite } from "@/lib/favorites";

interface FavoriteButtonProps {
  username: string;
}

export default function FavoriteButton({ username }: FavoriteButtonProps) {
  // Start false and sync on mount: localStorage is not available during SSR, so
  // reading it during render would cause a hydration mismatch.
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(isFavorite(username));
  }, [username]);

  const toggle = () => {
    if (favorited) {
      removeFavorite(username);
      setFavorited(false);
    } else {
      addFavorite(username);
      setFavorited(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={
        favorited
          ? `Remove @${username} from favorites`
          : `Add @${username} to favorites`
      }
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
        favorited
          ? "border-amber-300 dark:border-amber-500/40 text-amber-500 bg-amber-50 dark:bg-amber-900/20"
          : "border-gray-200 dark:border-slate-600 text-gray-400 dark:text-gray-500 hover:text-amber-500 hover:border-amber-300"
      }`}
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.5a.56.56 0 011.04 0l2.13 4.32c.08.17.24.29.42.31l4.77.69c.46.07.64.63.31.95l-3.45 3.36a.56.56 0 00-.16.5l.81 4.75c.08.46-.4.81-.81.59l-4.26-2.24a.56.56 0 00-.52 0l-4.26 2.24c-.41.22-.89-.13-.81-.59l.81-4.75a.56.56 0 00-.16-.5L2.48 10.07c-.33-.32-.15-.88.31-.95l4.77-.69a.56.56 0 00.42-.31L11.48 3.5z"
        />
      </svg>
    </button>
  );
}
