import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { env } from '@/lib/env'
import { logError } from '@/lib/errorLogger'

interface StarEntry {
  date: string
  count: number
}

interface ErrorResponse {
  error: string
  errorType: 'not_found' | 'rate_limited' | 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StarEntry[] | ErrorResponse>,
) {
  const { owner, repo } = req.query

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing owner or repo parameter', errorType: 'unknown' })
  }

  const token = env.GITHUB_TOKEN

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/vnd.github.v3.star+json',
        },
        params: { per_page: 100 },
        validateStatus: () => true,
      },
    )

    if (response.status === 404) {
      return res.status(404).json({ error: 'Repository not found', errorType: 'not_found' })
    }
    if (response.status === 403) {
      return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
    }
    if (response.status !== 200) {
      return res.status(500).json({ error: 'Failed to fetch star history', errorType: 'unknown' })
    }

    const stargazers: { starred_at: string }[] = response.data

    if (stargazers.length === 0) {
      return res.status(200).json([])
    }

    const timeline: StarEntry[] = []
    const dateCounts: Record<string, number> = {}
    let runningTotal = 0

    for (const sg of stargazers) {
      const day = sg.starred_at.split('T')[0]
      dateCounts[day] = (dateCounts[day] || 0) + 1
    }

    const sortedDates = Object.keys(dateCounts).sort()
    for (const date of sortedDates) {
      runningTotal += dateCounts[date]
      timeline.push({ date, count: runningTotal })
    }

    return res.status(200).json(timeline)
  } catch (error) {
    logError('api/star-history', error, { owner, repo })
    return res.status(500).json({ error: 'Failed to fetch star history', errorType: 'unknown' })
  }
}
