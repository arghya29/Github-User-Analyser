import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import type { SponsorInfo } from '@/types/github'
import { env } from '@/lib/env'

interface ErrorResponse {
  error: string
  errorType: 'rate_limited' | 'unknown'
}

const SPONSORS_QUERY = `
query($login: String!) {
  user(login: $login) {
    sponsorshipForViewerAsSponsoree(first: 10) {
      nodes {
        sponsor {
          login
          avatarUrl
          url
        }
        tier {
          name
        }
      }
    }
    isSponsoredBy(accountLogin: $login)
  }
}
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SponsorInfo[] | ErrorResponse>
) {
  const { username } = req.query

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Missing username parameter', errorType: 'unknown' })
  }

  const token = env.GITHUB_TOKEN

  if (!token) {
    return res.status(200).json([])
  }

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query: SPONSORS_QUERY, variables: { login: username } },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    )

    if (response.status === 403) {
      return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
    }

    if (response.status !== 200) {
      return res.status(200).json([])
    }

    const data = response.data?.data?.user
    if (!data) {
      return res.status(200).json([])
    }

    const sponsors: SponsorInfo[] = []

    const nodes = data.sponsorshipForViewerAsSponsoree?.nodes || []
    for (const node of nodes) {
      if (node?.sponsor) {
        sponsors.push({
          login: node.sponsor.login,
          avatarUrl: node.sponsor.avatarUrl,
          htmlUrl: node.sponsor.url,
          tierName: node.tier?.name,
          isSponsoring: false,
        })
      }
    }

    return res.status(200).json(sponsors)
  } catch {
    return res.status(200).json([])
  }
}
