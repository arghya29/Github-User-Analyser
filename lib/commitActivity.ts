import axios from 'axios'
import type { CodeFrequency } from '@/types/github'

export async function fetchCommitActivity(
  owner: string,
  repo: string
): Promise<CodeFrequency[]> {
  const response = await axios.get<CodeFrequency[]>(
    `/api/commit-activity?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}
