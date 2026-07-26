import axios from 'axios'
import type { StarHistoryResponse } from '@/types/github'

export async function fetchStarHistory(
  owner: string,
  repo: string
): Promise<StarHistoryResponse> {
  const response = await axios.get<StarHistoryResponse>(
    `/api/star-history?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}
