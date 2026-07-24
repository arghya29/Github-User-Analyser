import axios from 'axios'
import type { ActivityEvent } from '@/types/github'

export async function fetchUserActivity(username: string): Promise<ActivityEvent[]> {
  const response = await axios.get<ActivityEvent[]>(
    `/api/activity?username=${encodeURIComponent(username)}`,
    { validateStatus: () => true },
  )
  return response.data
}
