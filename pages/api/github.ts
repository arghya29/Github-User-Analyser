import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import type {
  UserData,
  GitHubUser,
  Repository,
  ContributionsData,
  EngagementStats,
  RateLimitInfo,
} from '@/types/github'
import { computeProductivityStats } from '@/lib/contributionStats'
import { getCachedWithFallback } from '@/lib/cache'
import { sanitizeUsername } from '@/lib/securitySanitizer'
import { env } from '@/lib/env'
import { withRetry, type RetryInfo } from '@/lib/retry'
import { logError, logWarn } from '@/lib/errorLogger'

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Abort a hung GitHub request instead of letting it hang until the platform kills
// the invocation, leaving the user on an indefinite loading state.
const GITHUB_TIMEOUT_MS = 10000

/**
 * Logs a retry with enough context to tell causes apart. `context` is always a
 * hardcoded literal and no user-controlled value is interpolated, so this stays
 * clear of log-injection.
 */
function retryLogger(context: string) {
  return ({ attempt, delayMs, error }: RetryInfo) => {
    const status = (error as { response?: { status?: number } })?.response
      ?.status
    const code = (error as { code?: string })?.code
    // Only the derived status/code go into the log — never the error object or the request
    // config, which carries the Authorization header.
    logWarn('api/github', 'transient failure; retrying request', {
      context,
      attempt,
      delayMs,
      status,
      code,
    })
  }
}

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

// FIX 1: Add $from and $to variables to the query definition and pass them to contributionsCollection
const GRAPHQL_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
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
      contributionsCollection(from: $from, to: $to) {
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
  // FIX 2: Calculate a strict 1-year UTC window to prevent timezone drifting
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setUTCFullYear(toDate.getUTCFullYear() - 1)

  const response = await withRetry(
    () =>
      axios.post(
        'https://api.github.com/graphql',
        {
          query: GRAPHQL_QUERY,
          variables: {
            username,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: GITHUB_TIMEOUT_MS,
        }
      ),
    { onRetry: retryLogger('graphql') }
  )

  const errors = response.data?.errors as
    { type?: string; message?: string }[] | undefined
  if (errors && errors.length > 0) {
    const combinedMessage = errors
      .map((e) => e.message || '')
      .join(' ')
      .toLowerCase()
    if (
      errors.some((e) => e.type === 'NOT_FOUND') ||
      combinedMessage.includes('could not resolve')
    ) {
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
    totalCommitContributions:
      userNode.contributionsCollection.totalCommitContributions,
    totalIssueContributions:
      userNode.contributionsCollection.totalIssueContributions,
    totalPullRequestContributions:
      userNode.contributionsCollection.totalPullRequestContributions,
    totalPullRequestReviewContributions:
      userNode.contributionsCollection.totalPullRequestReviewContributions,
  }

  const rateLimitNode = response.data?.data?.rateLimit as
    { limit?: number; remaining?: number; resetAt?: string } | null | undefined
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
function parseRestRateLimit(
  headers: Record<string, unknown>
): RateLimitInfo | undefined {
  const limit = Number(headers['x-ratelimit-limit'])
  const remaining = Number(headers['x-ratelimit-remaining'])
  const reset = Number(headers['x-ratelimit-reset'])
  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) {
    return undefined
  }
  return {
    limit,
    remaining,
    resetAt: Number.isFinite(reset)
      ? new Date(reset * 1000).toISOString()
      : undefined,
  }
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
    if (env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`
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
    const bucket = env.GITHUB_TOKEN ? resources?.graphql : resources?.core
    if (
      !bucket ||
      typeof bucket.limit !== 'number' ||
      typeof bucket.remaining !== 'number'
    ) {
      return undefined
    }
    return {
      limit: bucket.limit,
      remaining: bucket.remaining,
      resetAt:
        typeof bucket.reset === 'number'
          ? new Date(bucket.reset * 1000).toISOString()
          : undefined,
    }
  } catch {
    return undefined
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserData>
) {
  const { username: rawUsername } = req.query

  if (!rawUsername || typeof rawUsername !== 'string') {
    return res.status(400).json({
      user: {} as GitHubUser,
      repos: [],
      contributions: null,
      engagement: null,
      productivity: null,
      error: 'Invalid username',
      errorType: 'unknown',
    })
  }

  let username: string
  try {
    username = sanitizeUsername(rawUsername)
  } catch {
    return res.status(400).json({
      user: {} as GitHubUser,
      repos: [],
      contributions: null,
      engagement: null,
      productivity: null,
      error: 'Invalid username format.',
      errorType: 'unknown',
    })
  }

  const cacheKey = `github-profile:${username.toLowerCase()}`

  try {
    const cached = await getCachedWithFallback<UserData>(
      cacheKey,
      PROFILE_CACHE_TTL_MS,
      async () => {
        if (env.GITHUB_TOKEN) {
          try {
            const result = await fetchViaGraphQL(username)
            const productivity = computeProductivityStats(
              result.contributions.weeks
            )
            return { ...result, productivity } as UserData
          } catch (err) {
            if (err instanceof GraphQLNotFoundError) {
              throw err
            }
            // Non-"not found" GraphQL failures (rate-limit, transient 5xx, partial
            // GraphQL/schema errors) previously fell through to REST silently,
            // degrading token-backed deployments (no heatmap/engagement/productivity)
            // with nothing in the logs. Keep the graceful REST fallback, but log
            // with enough context to tell the causes apart.
            const message = err instanceof Error ? err.message : String(err)
            const kind = /rate limit|secondary rate|api rate/i.test(message)
              ? 'rate-limit'
              : err instanceof GraphQLOtherError
                ? 'graphql-error'
                : 'transient'
            // A warning, not an error: the REST fallback below still serves the request.
            // console.error overstated it.
            logWarn(
              'api/github',
              'GraphQL fetch failed; falling back to REST',
              {
                username,
                kind,
                reason: message,
              }
            )
          }
        }

        const headers: Record<string, string> = {
          Accept: 'application/vnd.github.v3+json',
        }
        if (env.GITHUB_TOKEN) {
          headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`
        }

        const [userResponse, reposResponse] = await Promise.all([
          withRetry(
            () =>
              axios.get(`https://api.github.com/users/${username}`, {
                headers,
                timeout: GITHUB_TIMEOUT_MS,
              }),
            { onRetry: retryLogger('rest:user') }
          ),
          withRetry(
            () =>
              axios.get(
                `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&per_page=100`,
                { headers, timeout: GITHUB_TIMEOUT_MS }
              ),
            { onRetry: retryLogger('rest:repos') }
          ),
        ])

        return {
          user: userResponse.data,
          repos: reposResponse.data,
          contributions: null,
          engagement: null,
          productivity: null,
          pinnedRepos: [],
        } as UserData
      }
    )

    const rateLimit = await fetchRateLimitSnapshot()
    return res.status(200).json({ ...cached, rateLimit })
  } catch (err: unknown) {
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

    // A timeout aborts with code ECONNABORTED and carries no response — surface it
    // as a distinct network error rather than falling through to a generic failure.
    if ((err as { code?: string }).code === 'ECONNABORTED') {
      logWarn('api/github', 'request to GitHub timed out', { username })
      return res.status(504).json({
        user: {} as GitHubUser,
        repos: [],
        contributions: null,
        engagement: null,
        productivity: null,
        error: 'The request to GitHub timed out. Please try again.',
        errorType: 'network',
      })
    }

    const axiosErr = err as {
      response?: { status?: number; headers?: Record<string, unknown> }
    }
    if (
      axiosErr.response?.status === 403 ||
      axiosErr.response?.status === 429
    ) {
      // Only the status goes into the log — never `axiosErr.response.headers`, and never the
      // error object itself, whose request config carries the Authorization header.
      logWarn('api/github', 'GitHub rate limit reached', {
        username,
        status: axiosErr.response.status,
      })
      const rateLimit = parseRestRateLimit(
        axiosErr.response.headers as unknown as Record<string, unknown>
      )
      return res.status(axiosErr.response?.status || 403).json({
        user: {} as GitHubUser,
        repos: [],
        contributions: null,
        engagement: null,
        productivity: null,
        error:
          'GitHub API rate limit reached. Please try again later or add GITHUB_TOKEN.',
        errorType: 'rate_limited',
        rateLimit,
      })
    }

    // Everything above is an expected outcome — an unknown username, a timeout, a rate limit.
    // Reaching here means something we didn't anticipate, which is exactly what the log is for.
    logError('api/github', err, { username })
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
