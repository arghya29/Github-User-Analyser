import type { NextApiRequest, NextApiResponse } from 'next'
import type { Repository } from '@/types/github'
import { sanitizeUsername, escapeCsvCell } from '@/lib/securitySanitizer'
import { getClientIp, createRateLimiter } from '@/lib/rateLimit'
import { validateRequest, exportUserDataSchema } from '@/lib/apiValidation'
import { logError } from '@/lib/errorLogger'

// Align with the other export/AI routes: a per-IP limiter on this metered route.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const rateLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const retryAfter = await rateLimiter.check(getClientIp(req))
  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter))
    return res
      .status(429)
      .json({ error: `Too many requests \u2014 please wait ${retryAfter}s and try again` })
  }

  try {
    const validated = validateRequest(res, exportUserDataSchema, req.body)
    if (validated === null) return
    const { user } = validated
    const repos = validated.repos as Repository[]

    // Validate the login before it enters the Content-Disposition header. If it
    // isn't a well-formed GitHub username, fall back to a safe fixed filename
    // (prevents header injection and malformed downloads).
    let filename = 'repositories.csv'
    try {
      filename = `${sanitizeUsername(user.login)}-repositories.csv`
    } catch {
      // keep the safe fallback
    }

    const headers = [
      'Repository Name',
      'Language',
      'Stars',
      'Forks',
      'Open Issues',
      'Created At',
      'URL',
    ]
    const rows = repos.map((repo) => [
      escapeCsvCell(repo?.name),
      escapeCsvCell(repo?.language || 'N/A'),
      Number(repo?.stargazers_count) || 0,
      Number(repo?.forks_count) || 0,
      Number(repo?.open_issues_count) || 0,
      escapeCsvCell(repo?.updated_at || ''),
      escapeCsvCell(repo?.html_url || ''),
    ])

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    // RFC 6266: the filename is quoted (and the value is sanitized above).
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(csvContent)
  } catch (error) {
    logError('api/export/csv', error)
    return res.status(500).json({ error: 'Failed to generate CSV export' })
  }
}
