const FAVORITES_KEY = "github-analyzer-favorites";
const MAX_FAVORITES = 50;

function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

/**
 * Reads the saved favorite usernames from localStorage. Returns an empty list
 * when storage is unavailable (e.g. private browsing) or the stored value is
 * missing/corrupt, so callers never have to guard against a throw.
 */
export function getFavorites(): string[] {
  try {
    const storage = getStorage();
    const saved = storage?.getItem(FAVORITES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Keep only strings (a corrupt value like [42] would otherwise crash
        // isFavorite()'s .toLowerCase()) and re-apply the cap so a user-edited,
        // overlong stored value can't leak an oversized list to the UI.
        return parsed
          .filter((item): item is string => typeof item === "string")
          .slice(0, MAX_FAVORITES);
      }
    }
  } catch {
    // localStorage unavailable or corrupt — treat as no favorites
  }
  return [];
}

/** True when `username` is already favorited (case-insensitive). */
export function isFavorite(username: string): boolean {
  return getFavorites().some((f) => f.toLowerCase() === username.toLowerCase());
}

/**
 * Adds `username` to the front of the favorites list (case-insensitive
 * de-dupe), caps the list, persists it, and returns the new list. A no-op that
 * returns the current list if the user is already favorited.
 */
export function addFavorite(username: string): string[] {
  const current = getFavorites();
  if (current.some((f) => f.toLowerCase() === username.toLowerCase())) {
    return current;
  }
  const next = [username, ...current].slice(0, MAX_FAVORITES);
  try {
    getStorage()?.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore write failures
  }
  return next;
}

/** Removes `username` (case-insensitive), persists, and returns the new list. */
export function removeFavorite(username: string): string[] {
  const next = getFavorites().filter(
    (f) => f.toLowerCase() !== username.toLowerCase(),
  );
  try {
    getStorage()?.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore write failures
  }
  return next;
}
