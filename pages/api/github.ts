import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import type { UserData, ContributionsData } from '@/types/github'

async function fetchContributions(
  username: string
): Promise<ContributionsData | null> {
  // GitHub's contribution calendar is only exposed via the GraphQL API,
  // which always requires authentication (even for public data).
  // Without a token we simply skip this and let the UI degrade gracefully.
  if (!process.env.GITHUB_TOKEN) return null

  const query = `
    query($username: String!) {
      user(login: $username) {
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

  try {
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

    const calendar =
      response.data?.data?.user?.contributionsCollection?.contributionCalendar

    if (!calendar) return null

    return {
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks.map((week: { contributionDays: { contributionCount: number; date: string }[] }) => ({
        contributionDays: week.contributionDays.map((day) => ({
          date: day.date,
          count: day.contributionCount,
        })),
      })),
    }
  } catch {
    // Activity heatmap is a bonus feature — never let it break the main response
    return null
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserData>
) {
  const { username } = req.query

  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      user: {} as UserData['user'],
      repos: [],
      contributions: null,
      error: 'Username is required',
      errorType: 'unknown',
    })
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  }

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const [userResponse, reposResponse, contributions] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, { headers }),
      axios.get(
        `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&per_page=100`,
        { headers }
      ),
      fetchContributions(username),
    ])

    return res.status(200).json({
      user: userResponse.data,
      repos: reposResponse.data,
      contributions,
    })
  } catch (err: unknown) {
    const error = err as AxiosError

    if (error.response?.status === 404) {
      return res.status(404).json({
        user: {} as UserData['user'],
        repos: [],
        contributions: null,
        error: 'User not found',
        errorType: 'not_found',
      })
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        user: {} as UserData['user'],
        repos: [],
        contributions: null,
        error: 'GitHub API rate limit reached. Please try again in a few minutes.',
        errorType: 'rate_limited',
      })
    }

    return res.status(500).json({
      user: {} as UserData['user'],
      repos: [],
      contributions: null,
      error: 'Failed to fetch GitHub data',
      errorType: 'unknown',
    })
  }
}