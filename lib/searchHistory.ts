const HISTORY_KEY = 'github-analyzer-history'
const MAX_HISTORY = 5

/**
 * Reads the saved search history from localStorage. Returns an empty list when
 * storage is unavailable (e.g. private browsing) or the stored value is
 * missing/corrupt, so callers never have to guard against a throw.
 */
export function loadHistory(): string[] {
  try {
    const saved = window.localStorage.getItem(HISTORY_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        // Keep only strings — a corrupt value like [42] would otherwise crash
        // recordSearch()'s .toLowerCase() on the next search.
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    }
  } catch {
    // localStorage unavailable or corrupt — just skip history
  }
  return []
}

/**
 * Records a successful search: moves `username` to the front, de-duplicates
 * (case-insensitively), caps the list, persists it, and returns the new list.
 */
export function recordSearch(username: string): string[] {
  const current = loadHistory()
  const deduped = [username, ...current.filter((h) => h.toLowerCase() !== username.toLowerCase())]
  const next = deduped.slice(0, MAX_HISTORY)
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // ignore write failures
  }
  return next
}

/** Clears the stored history and returns the new (empty) list. */
export function clearHistory(): string[] {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([]))
  } catch {
    // ignore write failures
  }
  return []
}
