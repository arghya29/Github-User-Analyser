import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'

interface GitHubUser {
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

interface Repository {
  name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
}

interface UserData {
  user: GitHubUser
  repos: Repository[]
  error?: string
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
      error: 'Username is required' 
    })
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  }

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  try {
    // Fetch user data
    const userResponse = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers }
    )

    // Fetch user repositories
    const reposResponse = await axios.get(
      `https://api.github.com/users/${username}/repos?sort=stars&order=desc&per_page=6`,
      { headers }
    )

    return res.status(200).json({
      user: userResponse.data,
      repos: reposResponse.data,
    })
  } catch (err: unknown) {
    const error = err as AxiosError;
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        user: {} as GitHubUser,
        repos: [],
        error: 'User not found',
      })
    }
    return res.status(500).json({
      user: {} as GitHubUser,
      repos: [],
      error: 'Failed to fetch GitHub data',
    })
  }
}