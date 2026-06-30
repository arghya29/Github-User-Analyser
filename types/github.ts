export interface GitHubUser {
  login: string
  name: string
  bio: string
  avatar_url: string
  public_repos: number
  followers: number
  following: number
  created_at: string
  updated_at: string
  location: string
  blog: string
  twitter_username: string
  company: string
  html_url: string
}

export interface Repository {
  name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  watchers_count?: number
  open_issues_count?: number
  closed_issues_count?: number
  license?: string | null
  languages?: LanguageBytes[]
  owner_login?: string
}

export interface LanguageBytes {
  name: string
  bytes: number
}

export interface ContributionDay {
  date: string
  count: number
}

export interface ContributionWeek {
  contributionDays: ContributionDay[]
}

export interface ContributionsData {
  totalContributions: number
  weeks: ContributionWeek[]
}

export interface EngagementStats {
  totalCommitContributions: number
  totalIssueContributions: number
  totalPullRequestContributions: number
  totalPullRequestReviewContributions: number
}

export interface ProductivityStats {
  currentStreak: number
  longestStreak: number
  mostProductiveDay: { date: string; count: number } | null
  weekdayCount: number
  weekendCount: number
  monthlyTotals: { month: string; count: number }[]
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt?: string
}

export interface UserData {
  user: GitHubUser
  repos: Repository[]
  contributions: ContributionsData | null
  engagement: EngagementStats | null
  productivity: ProductivityStats | null
  pinnedRepos?: Repository[]
  rateLimit?: RateLimitInfo
  error?: string
  errorType?: 'not_found' | 'rate_limited' | 'unknown'
}

export type SortOption = 'stars' | 'updated' | 'forks'