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
  description: string | null // 🛠️ FIX: Added null safety
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string | null // 🛠️ FIX: Added null safety
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
  errorType?: 'not_found' | 'rate_limited' | 'network' | 'unknown'
}

export interface StarEntry {
  date: string
  count: number
}

export interface StarHistoryResponse {
  timeline: StarEntry[]
  /** True when the page cap was reached and more stargazers exist. */
  truncated: boolean
  /** How many stargazer records the timeline was built from. */
  sampleSize: number
}

export interface ActivityEvent {
  id: string
  type: string
  repo: string
  repoUrl: string
  createdAt: string
  payload: string
}

export interface FollowerUser {
  login: string
  avatarUrl: string
  htmlUrl: string
  type: string
}

export interface CommitActivity {
  days: number[]
  total: number
  week: number
}

export interface LanguageBreakdown {
  name: string
  bytes: number
  percentage: number
  color: string
}

export interface CompareResult {
  name: string // 🛠️ FIX: Standardized from repoName
  owner_login: string // 🛠️ FIX: Standardized from owner
  stargazers_count: number // 🛠️ FIX: Standardized from stars
  forks_count: number // 🛠️ FIX: Standardized from forks
  open_issues_count: number // 🛠️ FIX: Standardized from openIssues
  language: string | null // 🛠️ FIX: Added null safety
  description: string | null // 🛠️ FIX: Added null safety
  html_url: string // 🛠️ FIX: Standardized from url
}

export interface WatchlistItem {
  id: string
  type: 'user' | 'repo'
  name: string
  addedAt: string
  data?: Record<string, unknown>
}

export interface SponsorInfo {
  login: string
  avatarUrl: string
  htmlUrl: string
  tierName?: string
  isSponsoring: boolean
}

export interface CodeFrequency {
  week: number
  additions: number
  deletions: number
  total: number
}

export type SortOption = 'stars' | 'updated' | 'forks'
