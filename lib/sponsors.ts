import axios from 'axios'
import type { SponsorInfo } from '@/types/github'

export async function fetchSponsors(username: string): Promise<SponsorInfo[]> {
  const response = await axios.get<SponsorInfo[]>(
    `/api/sponsors?username=${encodeURIComponent(username)}`,
    { validateStatus: () => true },
  )
  return response.data
}
