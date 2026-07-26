import axios from 'axios'
import type { StarHistoryResponse, StarHistoryErrorResponse } from '@/types/github'

export async function fetchStarHistory(
  owner: string,
  repo: string
): Promise<StarHistoryResponse | StarHistoryErrorResponse> {
  const response = await axios.get<StarHistoryResponse | StarHistoryErrorResponse>(
    `/api/star-history?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}
