import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import type {
  UserData,
  GitHubUser,
  Repository,
  ContributionsData,
  EngagementStats,
} from '@/types/github'
import { computeProductivityStats } from '@/lib/contributionStats'
import { getCached, setCached } from '@/lib/cache'

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

class GraphQLNotFoundError extends Error {}
class GraphQLOtherError extends Error {}

interface GraphQLLanguageEdge {
  size: number
  node: { name: string }
}

interface GraphQLRepoNode {
  name: string
  description: string | null
  url: string
  stargazerCount: number
  forkCount: number
  updatedAt: string
  primaryLanguage: { name: string } | null
  watchers: { totalCount: number }
  issues: { totalCount: number }
  closedIssues: { totalCount: number }
  licenseInfo: { spdxId: string | null } | null
  languages: { edges: GraphQLLanguageEdge[] } | null
}

interface GraphQLContributionDay {
  contributionCount: number
  date: string
}

interface GraphQLUserResponse {
  login: string
  name: string | null
  bio: string | null
  avatarUrl: string
  websiteUrl: string | null
  twitterUsername: string | null
  company: string | null
  location: string | null
  createdAt: string
  updatedAt: string
  url: string
  followers: { totalCount: number }
  following: { totalCount: number }
  contributionsCollection: {
    totalCommitContributions: number
    totalIssueContributions: number
    totalPullRequestContributions: number
    totalPullRequestReviewContributions: number
    contributionCalendar: {
      totalContributions: number
      weeks: { contributionDays: GraphQLContributionDay[] }[]
    }
  }
  repositories: {
    totalCount: number
    nodes: GraphQLRepoNode[]
  }
}

const GRAPHQL_QUERY = `
  query($username: String!) {
    user(login: $username) {
      login
      name
      bio
      avatarUrl
      websiteUrl
      twitterUsername
      company
      location
      createdAt
      updatedAt
      url
      followers { totalCount }
      following { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
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
      repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: UPDATED_AT, direction: DESC}) {
        totalCount
        nodes {
          name
          description
          url
          stargazerCount
          forkCount
          updatedAt
          primaryLanguage { name }
          watchers { totalCount }
          issues(states: OPEN) { totalCount }
          closedIssues: issues(states: CLOSED) { totalCount }
          licenseInfo { spdxId }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node { name }
            }
          }
        }
      }
    }
  }
`

function mapGraphQLRepo(node: GraphQLRepoNode): Repository {
  return {
    name: node.name,
    description: node.description || '',
    html_url: node.url,
    stargazers_count: node.stargazerCount,
    forks_count: node.forkCount,
    language: node.primaryLanguage?.name || '',
    updated_at: node.updatedAt,
    watchers_count: node.watchers?.totalCount,
    open_issues_count: node.issues?.totalCount,
    closed_issues_count: node.closedIssues?.totalCount,
    license: node.licenseInfo?.spdxId || null,
    languages: (node.languages?.edges || []).map((edge) => ({
      name: edge.node.name,
      bytes: edge.size,
    })),
  }
}

function mapGraphQLUser(u: GraphQLUserResponse): GitHubUser {
  return {
    login: u.login,
    name: u.name || '',
    bio: u.bio || '',
    avatar_url: u.avatarUrl,
    public_repos: u.repositories.totalCount,
    followers: u.followers.totalCount,
    following: u.following.totalCount,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
    location: u.location || '',
    blog: u.websiteUrl || '',
    twitter_username: u.twitterUsername || '',
    company: u.company || '',
    html_url: u.url,
  }
}

async function fetchViaGraphQL(username: string): Promise<{
  user: GitHubUser
  repos: Repository[]
  contributions: ContributionsData
  engagement: EngagementStats
}> {
  const response = await axios.post(
    'https://api.github.com/graphql',
    { query: GRAPHQL_QUERY, variables: { username } },
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const errors = response.data?.errors as { type?: string; message?: string }[] | undefined
  if (errors && errors.length > 0) {
    const combinedMessage = errors.map((e) => e.message || '').join(' ').toLowerCase()
    if (errors.some((e) => e.type === 'NOT_FOUND') || combinedMessage.includes('could not resolve')) {
      throw new GraphQLNotFoundError()
    }
    throw new GraphQLOtherError(combinedMessage || 'GraphQL error')
  }

  const userNode = response.data?.data?.user as GraphQLUserResponse | null
  if (!userNode) {
    throw new GraphQLNotFoundError()
  }

  const repos = (userNode.repositories.nodes || []).map(mapGraphQLRepo)
  const user = mapGraphQLUser(userNode)

  const calendar = userNode.contributionsCollection.contributionCalendar
  const contributions: ContributionsData = {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => ({
      contributionDays: week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      })),
    })),
  }

  const engagement: EngagementStats = {
    totalCommitContributions: userNode.contributionsCollection.totalCommitContributions,
    totalIssueContributions: userNode.contributionsCollection.totalIssueContributions,
    totalPullRequestContributions: userNode.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions:
      userNode.contributionsCollection.totalPullRequestReviewContributions,
  }

  return { user, repos, contributions, engagement }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserData>
) {
  const { username } = req.query

  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      user: {} as GitHubUser,
      repos: [],
      contributions: null,
      engagement: null,
      productivity: null,
      error: 'Username is required',
      errorType: 'unknown',
    })
  }

  const cacheKey = `github-profile:${username.toLowerCase()}`
  const cached = getCached<UserData>(cacheKey)
  if (cached) {
    return res.status(200).json(cached)
  }

  // Preferred path: one GraphQL call gets profile + engagement + contribution
  // calendar + repos (with watchers/open issues/language bytes) in one shot.
  // GraphQL always requires auth, so this only runs when a token is configured.
  if (process.env.GITHUB_TOKEN) {
    try {
      const { user, repos, contributions, engagement } = await fetchViaGraphQL(username)
      const productivity = computeProductivityStats(contributions.weeks)
      const result: UserData = { user, repos, contributions, engagement, productivity }

      setCached(cacheKey, result, PROFILE_CACHE_TTL_MS)
      return res.status(200).json(result)
    } catch (err) {
      if (err instanceof GraphQLNotFoundError) {
        return res.status(404).json({
          user: {} as GitHubUser,
          repos: [],
          contributions: null,
          engagement: null,
          productivity: null,
          error: 'User not found',
          errorType: 'not_found',
        })
      }
      // Any other GraphQL failure (rate limit, network hiccup, schema surprise)
      // falls through to the REST path below for a degraded-but-working response.
    }
  }

  // Fallback path: plain REST calls. Works with or without a token, just
  // without the engagement/productivity/byte-language extras.
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    const [userResponse, reposResponse] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, { headers }),
      axios.get(
        `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&per_page=100`,
        { headers }
      ),
    ])

    const result: UserData = {
      user: userResponse.data,
      repos: reposResponse.data,
      contributions: null,
      engagement: null,
      productivity: null,
    }

    setCached(cacheKey, result, PROFILE_CACHE_TTL_MS)
    return res.status(200).json(result)
  } catch (err: unknown) {
    const error = err as AxiosError

    if (error.response?.status === 404) {
      return res.status(404).json({
        user: {} as GitHubUser,
        repos: [],
        contributions: null,
        engagement: null,
        productivity: null,
        error: 'User not found',
        errorType: 'not_found',
      })
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        user: {} as GitHubUser,
        repos: [],
        contributions: null,
        engagement: null,
        productivity: null,
        error: 'GitHub API rate limit reached. Please try again in a few minutes.',
        errorType: 'rate_limited',
      })
    }

    return res.status(500).json({
      user: {} as GitHubUser,
      repos: [],
      contributions: null,
      engagement: null,
      productivity: null,
      error: 'Failed to fetch GitHub data',
      errorType: 'unknown',
    })
  }
}