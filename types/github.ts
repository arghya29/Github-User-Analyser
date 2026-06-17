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

export interface UserData {
  user: GitHubUser
  repos: Repository[]
  contributions: ContributionsData | null
  error?: string
  errorType?: 'not_found' | 'rate_limited' | 'unknown'
}

export type SortOption = 'stars' | 'updated' | 'forks'