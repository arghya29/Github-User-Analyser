import axios from 'axios'
import type { UserData } from '@/types/github'

/**
 * Fetches a user's profile, repositories, contributions, engagement and
 * productivity from the internal API route. Shared by the home page (compare
 * mode) and the /[username] profile route so both fetch identically.
 */
export async function fetchUserData(username: string): Promise<UserData> {
  // The API returns its typed `{ error, errorType }` payload with a non-2xx
  // status (404 not-found, 403 rate-limited, 500 failure). Resolve every status
  // so callers can branch on `data.error` instead of catching a thrown response
  // — this is what lets compare mode surface per-user error messages.
  const response = await axios.get<UserData>(
    `/api/github?username=${encodeURIComponent(username)}`,
    { validateStatus: () => true }
  )
  return response.data
}
