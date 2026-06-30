import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import type {
  UserData,
  GitHubUser,
  Repository,
  ContributionsData,
  EngagementStats,
  RateLimitInfo,
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

interface GraphQLPinnedRepoNode {
  name: string
  description: string | null
  url: string
  stargazerCount: number
  forkCount: number
  updatedAt: string
  primaryLanguage: { name: string } | null
  owner: { login: string } | null
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
  pinnedItems: {
    nodes: GraphQLPinnedRepoNode[]
  }
}

const GRAPHQL_QUERY = `
  query($username: String!) {
    rateLimit {
      limit
      remaining
      resetAt
    }
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
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            stargazerCount
            forkCount
            updatedAt
            primaryLanguage { name }
            owner { login }
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

function mapGraphQLPinnedRepo(node: GraphQLPinnedRepoNode): Repository {
  return {
    name: node.name,
    description: node.description || '',
    html_url: node.url,
    stargazers_count: node.stargazerCount,
    forks_count: node.forkCount,
    language: node.primaryLanguage?.name || '',
    updated_at: node.updatedAt,
    owner_login: node.owner?.login,
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
  pinnedRepos: Repository[]
  rateLimit: RateLimitInfo | undefined
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
  const pinnedRepos = (userNode.pinnedItems?.nodes || [])
    .filter((node) => node && node.name)
    .map(mapGraphQLPinnedRepo)
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

  const rateLimitNode = response.data?.data?.rateLimit as
    | { limit?: number; remaining?: number; resetAt?: string }
    | null
    | undefined
  const rateLimit: RateLimitInfo | undefined =
    rateLimitNode &&
    typeof rateLimitNode.limit === 'number' &&
    typeof rateLimitNode.remaining === 'number'
      ? {
          limit: rateLimitNode.limit,
          remaining: rateLimitNode.remaining,
          resetAt: rateLimitNode.resetAt,
        }
      : undefined

  return { user, repos, contributions, engagement, pinnedRepos, rateLimit }
}

/**
 * Reads GitHub's rate-limit values from REST response headers
 * (`x-ratelimit-limit` / `-remaining` / `-reset`) and shapes them like the
 * GraphQL `rateLimit` field. Returns `undefined` when the headers are absent.
 */
function parseRestRateLimit(headers: Record<string, unknown>): RateLimitInfo | undefined {
  const limit = Number(headers['x-ratelimit-limit'])
  const remaining = Number(headers['x-ratelimit-remaining'])
  const reset = Number(headers['x-ratelimit-reset'])
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) {
    return undefined
  }
  return {
    limit,
    remaining,
    resetAt: Number.isFinite(reset) ? new Date(reset * 1000).toISOString() : undefined,
  }
}

/**
 * Returns whichever snapshot reports the lower remaining quota. The REST
 * fallback fires two requests in parallel, each decrementing the budget, so the
 * badge should reflect the most-drained (safest) value rather than over-report.
 */
function pickLowerRateLimit(
  a: RateLimitInfo | undefined,
  b: RateLimitInfo | undefined
): RateLimitInfo | undefined {
  if (!a) return b
  if (!b) return a
  return a.remaining <= b.remaining ? a : b
}

/**
 * Fetches a fresh rate-limit snapshot from GitHub's dedicated `/rate_limit`
 * endpoint, which does not itself consume quota. Picks the bucket matching the
 * path the app uses (GraphQL when a token is configured, otherwise REST core)
 * and returns `undefined` if it can't be read. Used on cache hits so the badge
 * stays current without re-fetching the whole profile.
 */
async function fetchRateLimitSnapshot(): Promise<RateLimitInfo | undefined> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    // Best-effort only: a short timeout ensures a stalled GitHub request can't
    // block the otherwise-fast cached profile response.
    const response = await axios.get('https://api.github.com/rate_limit', {
      headers,
      timeout: 2000,
    })
    const resources = response.data?.resources as
      | Record<string, { limit?: number; remaining?: number; reset?: number }>
      | undefined
    const bucket = process.env.GITHUB_TOKEN ? resources?.graphql : resources?.core
    if (!bucket || typeof bucket.limit !== 'number' || typeof bucket.remaining !== 'number') {
      return undefined
    }
    return {
      limit: bucket.limit,
      remaining: bucket.remaining,
      resetAt:
        typeof bucket.reset === 'number' ? new Date(bucket.reset * 1000).toISOString() : undefined,
    }
  } catch {
    return undefined
  }
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
    // Rate-limit quota is deliberately not cached (it would go stale), so fetch
    // a fresh snapshot and merge it in to keep the badge live on cache hits.
    const rateLimit = await fetchRateLimitSnapshot()
    return res.status(200).json({ ...cached, rateLimit })
  }

  // Preferred path: one GraphQL call gets profile + engagement + contribution
  // calendar + repos (with watchers/open issues/language bytes) in one shot.
  // GraphQL always requires auth, so this only runs when a token is configured.
  if (process.env.GITHUB_TOKEN) {
    try {
      const { user, repos, contributions, engagement, pinnedRepos, rateLimit } = await fetchViaGraphQL(username)
      const productivity = computeProductivityStats(contributions.weeks)
      const result: UserData = { user, repos, contributions, engagement, productivity, pinnedRepos }

      // Cache the profile WITHOUT the volatile rate-limit value; return the
      // fresh snapshot from this request to the client.
      setCached(cacheKey, result, PROFILE_CACHE_TTL_MS)
      return res.status(200).json({ ...result, rateLimit })
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
      pinnedRepos: [],
    }

    // Both REST calls decrement the quota in parallel; keep the lower remaining
    // so the badge can't over-report. Cache without it; return it fresh.
    const rateLimit = pickLowerRateLimit(
      parseRestRateLimit(userResponse.headers as unknown as Record<string, unknown>),
      parseRestRateLimit(reposResponse.headers as unknown as Record<string, unknown>)
    )
    setCached(cacheKey, result, PROFILE_CACHE_TTL_MS)
    return res.status(200).json({ ...result, rateLimit })
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