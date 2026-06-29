import axios from 'axios'
import type { UserData } from '@/types/github'

/**
 * Fetches a user's profile, repositories, contributions, engagement and
 * productivity from the internal API route. Shared by the home page (compare
 * mode) and the /[username] profile route so both fetch identically.
 */
export async function fetchUserData(username: string): Promise<UserData> {
  const response = await axios.get(`/api/github?username=${encodeURIComponent(username)}`)
  return response.data
}
