import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import { getCached, setCached } from '@/lib/cache'

interface ReadmeResponse {
  content: string | null
  error?: string
}

const README_CACHE_TTL_MS = 10 * 60 * 1000 // READMEs change rarely, cache longer than profile data

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReadmeResponse>
) {
  const { owner, repo } = req.query

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ content: null, error: 'owner and repo are required' })
  }

  const cacheKey = `readme:${owner}/${repo}`
  const cached = getCached<ReadmeResponse>(cacheKey)
  if (cached) {
    return res.status(200).json(cached)
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers,
    })

    const base64Content = response.data.content as string
    const decoded = Buffer.from(base64Content, 'base64').toString('utf-8')
    const result: ReadmeResponse = { content: decoded }

    setCached(cacheKey, result, README_CACHE_TTL_MS)
    return res.status(200).json(result)
  } catch (err: unknown) {
    const error = err as AxiosError

    if (error.response?.status === 404) {
      return res.status(404).json({ content: null, error: 'No README found for this repository' })
    }
    if (error.response?.status === 403) {
      return res.status(403).json({ content: null, error: 'GitHub API rate limit reached' })
    }
    return res.status(500).json({ content: null, error: 'Failed to fetch README' })
  }
}