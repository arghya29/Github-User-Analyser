import axios from 'axios'
import type { StarEntry } from '@/types/github'

export async function fetchStarHistory(
  owner: string,
  repo: string
): Promise<StarEntry[]> {
  const response = await axios.get<StarEntry[]>(
    `/api/star-history?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}
