import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import type { CodeFrequency } from '@/types/github'
import { env } from '@/lib/env'
import { logError } from '@/lib/errorLogger'

interface ErrorResponse {
  error: string
  errorType: 'not_found' | 'rate_limited' | 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CodeFrequency[] | ErrorResponse>,
) {
  const { owner, repo } = req.query

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing owner or repo parameter', errorType: 'unknown' })
  }

  const token = env.GITHUB_TOKEN

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/code_frequency`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        validateStatus: () => true,
      },
    )

    if (response.status === 404) {
      return res.status(404).json({ error: 'Repository not found', errorType: 'not_found' })
    }
    if (response.status === 403) {
      return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
    }
    if (response.status === 202) {
      return res.status(200).json([])
    }
    if (response.status !== 200 || !Array.isArray(response.data)) {
      return res
        .status(500)
        .json({ error: 'Failed to fetch commit activity', errorType: 'unknown' })
    }

    const raw = response.data as [number, number, number][]

    const activities: CodeFrequency[] = raw.map(([week, additions, deletions]) => ({
      week: week * 1000,
      additions,
      deletions,
      total: additions - deletions,
    }))

    return res.status(200).json(activities)
  } catch (error) {
    logError('api/commit-activity', error, { owner, repo })
    return res.status(500).json({ error: 'Failed to fetch commit activity', errorType: 'unknown' })
  }
}
