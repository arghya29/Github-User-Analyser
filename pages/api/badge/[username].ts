import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { getCached, setCached } from '@/lib/cache'

const BADGE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour — badges are embedded in READMEs so cache aggressively

interface BadgeData {
  name: string
  totalContributions: number
  currentStreak: number
}

async function fetchBadgeData(username: string): Promise<BadgeData | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  if (process.env.GITHUB_TOKEN) {
    const query = `
      query($username: String!) {
        user(login: $username) {
          name
          login
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const user = response.data?.data?.user
    if (!user) return null

    const calendar = user.contributionsCollection.contributionCalendar
    const days = calendar.weeks
      .flatMap((w: { contributionDays: { contributionCount: number; date: string }[] }) =>
        w.contributionDays.map((d) => d.contributionCount)
      )
      .reverse()

    let currentStreak = 0
    for (const count of days) {
      if (count > 0) currentStreak++
      else break
    }

    return {
      name: user.name || user.login,
      totalContributions: calendar.totalContributions,
      currentStreak,
    }
  }

  // REST fallback — no streak without GraphQL, just return profile basics
  const userRes = await axios.get(`https://api.github.com/users/${username}`, { headers })
  return {
    name: userRes.data.name || userRes.data.login,
    totalContributions: 0,
    currentStreak: 0,
  }
}

function buildSvg(data: BadgeData): string {
  const { name, totalContributions, currentStreak } = data
  const safeName = name.replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] || c)
  )

  return `<svg width="420" height="130" viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <clipPath id="round">
      <rect width="420" height="130" rx="12" ry="12"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="420" height="130" rx="12" ry="12" fill="url(#bg)"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="420" height="3" fill="url(#accentLine)" clip-path="url(#round)"/>

  <!-- Border -->
  <rect width="420" height="130" rx="12" ry="12" fill="none" stroke="#334155" stroke-width="1.5"/>

  <!-- App label -->
  <text x="20" y="26" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#64748b" font-weight="500" letter-spacing="0.5">
    GITHUB USER ANALYZER
  </text>

  <!-- Username -->
  <text x="20" y="52" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#f1f5f9" font-weight="700">
    ${safeName}
  </text>

  <!-- Divider -->
  <line x1="20" y1="64" x2="400" y2="64" stroke="#334155" stroke-width="1"/>

  <!-- Streak block -->
  <rect x="20" y="76" width="175" height="40" rx="8" fill="#1e293b"/>
  <path d="M48,89 C48,89 52,86 51,82 C53,84 54,87 52,90 C55,88 56,84 54,80 C57,83 58,89 56,93 C58,91 59,88 58,85 C61,89 60,96 56,100 C54,103 50,104 48,104 C44,104 40,101 40,96 C40,91 44,89 48,89 Z" fill="#f97316"/>
  <text x="62" y="94" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#f1f5f9" font-weight="700">${currentStreak}</text>
  <text x="62" y="109" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#64748b">day streak</text>

  <!-- Contributions block -->
  <rect x="210" y="76" width="190" height="40" rx="8" fill="#1e293b"/>
  <polygon points="238,89 239.8,93.6 244.7,93.8 240.9,96.9 242.1,101.7 238,99 233.9,101.7 235.1,96.9 231.3,93.8 236.2,93.6" fill="#eab308"/>
  <text x="252" y="94" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#f1f5f9" font-weight="700">${totalContributions.toLocaleString()}</text>
  <text x="252" y="109" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#64748b">contributions this year</text>
</svg>`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query
  if (!username || typeof username !== 'string') {
    return res.status(400).send('username is required')
  }

  const cacheKey = `badge:${username.toLowerCase()}`
  let data = getCached<BadgeData>(cacheKey)

  if (!data) {
    try {
      const fetched = await fetchBadgeData(username)
      if (!fetched) {
        return res.status(404).send('User not found')
      }
      data = fetched
      setCached(cacheKey, data, BADGE_CACHE_TTL_MS)
    } catch {
      return res.status(500).send('Failed to fetch GitHub data')
    }
  }

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  res.status(200).send(buildSvg(data))
}