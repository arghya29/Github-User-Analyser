import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import type { FollowerUser } from '@/types/github'
import { env } from '@/lib/env'

interface ErrorResponse {
  error: string
  errorType: 'not_found' | 'rate_limited' | 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FollowerUser[] | ErrorResponse>
) {
  const { username, type } = req.query

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Missing username parameter', errorType: 'unknown' })
  }

  const listType = type === 'following' ? 'following' : 'followers'
  const token = env.GITHUB_TOKEN

  try {
    const response = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/${listType}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/vnd.github.v3+json',
        },
        params: { per_page: 100 },
        validateStatus: () => true,
      }
    )

    if (response.status === 404) {
      return res.status(404).json({ error: 'User not found', errorType: 'not_found' })
    }
    if (response.status === 403) {
      return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
    }
    if (response.status !== 200) {
      return res.status(500).json({ error: `Failed to fetch ${listType}`, errorType: 'unknown' })
    }

    const users: FollowerUser[] = response.data.map((u: Record<string, unknown>) => ({
      login: u.login as string,
      avatarUrl: u.avatar_url as string,
      htmlUrl: u.html_url as string,
      type: u.type as string,
    }))

    return res.status(200).json(users)
  } catch {
    return res.status(500).json({ error: `Failed to fetch ${listType}`, errorType: 'unknown' })
  }
}
