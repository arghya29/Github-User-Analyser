import axios from 'axios'
import type { FollowerUser } from '@/types/github'

export async function fetchFollowersOrFollowing(
  username: string,
  type: 'followers' | 'following'
): Promise<FollowerUser[]> {
  const response = await axios.get<FollowerUser[]>(
    `/api/followers?username=${encodeURIComponent(username)}&type=${type}`,
    { validateStatus: () => true }
  )
  return response.data
}
