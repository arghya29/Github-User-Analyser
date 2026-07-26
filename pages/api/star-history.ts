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

interface StarHistoryResponse {
  timeline: StarEntry[]
  /** True when the page cap was reached and more stargazers exist. */
  truncated: boolean
  /** How many stargazer records the timeline was built from. */
  sampleSize: number
}

/**
 * GitHub returns stargazers oldest-first, 100 per page, so a single request only
 * ever sees the beginning of a popular repository's history — the chart would
 * climb to 100 and stop, years in the past, with no indication it was partial.
 *
 * Pagination is capped rather than exhaustive: each page is one API call against
 * a shared rate limit, and a repository with 80,000 stars would cost 800 of
 * them. Ten pages covers the large majority of repositories outright, and
 * anything beyond that is reported as truncated so the UI can say so instead of
 * quietly misrepresenting the trend.
 */
const MAX_PAGES = 10
const PER_PAGE = 100

/**
 * Extracts the `rel="next"` URL from a Link header.
 *
 * Its absence is what tells us the history is complete, which is the difference
 * between "this is all of it" and "this is the first 1,000".
 */
function hasNextPage(linkHeader: unknown): boolean {
  if (typeof linkHeader !== 'string' || linkHeader.length === 0) return false
  return /;\s*rel="next"/.test(linkHeader)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StarHistoryResponse | ErrorResponse>
) {
  const { owner, repo } = req.query

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing owner or repo parameter', errorType: 'unknown' })
  }

  const token = env.GITHUB_TOKEN

  try {
    const stargazers: { starred_at: string }[] = []
    let truncated = false

    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await axios.get(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/vnd.github.v3.star+json',
          },
          params: { per_page: PER_PAGE, page },
          validateStatus: () => true,
        }
      )

      // Errors are reported from whichever page hit them. A failure part-way
      // through is still a failure — returning a partial history silently is
      // the behaviour this route is being fixed for.
      if (response.status === 404) {
        return res.status(404).json({ error: 'Repository not found', errorType: 'not_found' })
      }
      if (response.status === 403) {
        return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
      }
      if (response.status !== 200) {
        return res.status(500).json({ error: 'Failed to fetch star history', errorType: 'unknown' })
      }

      const pageData: { starred_at: string }[] = Array.isArray(response.data) ? response.data : []
      stargazers.push(...pageData)

      if (!hasNextPage(response.headers?.link)) break

      // More pages exist but the cap is reached: the caller is getting a
      // sample, and needs to be told.
      if (page === MAX_PAGES) truncated = true
    }

    if (stargazers.length === 0) {
      return res.status(200).json({ timeline: [], truncated: false, sampleSize: 0 })
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

    return res.status(200).json({ timeline, truncated, sampleSize: stargazers.length })
  } catch (error) {
    logError('api/star-history', error, { owner, repo })
    return res.status(500).json({ error: 'Failed to fetch star history', errorType: 'unknown' })
  }
}
