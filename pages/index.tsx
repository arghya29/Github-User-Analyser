import { useState } from 'react'
import Head from 'next/head'
import axios, { type AxiosError } from 'axios'
import SearchBar from '@/components/SearchBar'
import UserCard from '@/components/UserCard'
import RepositoryCard from '@/components/RepositoryCard'
import Loading from '@/components/Loading'

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

export default function Home() {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (username: string) => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setLoading(true)
    setError('')
    setUser(null)
    setRepos([])

    try {
      const response = await axios.get(`/api/github?username=${username}`)
      
      if (response.data.error) {
        setError(response.data.error)
      } else {
        setUser(response.data.user)
        setRepos(response.data.repos)
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      setError(err.response?.data?.error || 'Failed to fetch user data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>GitHub User Analyzer</title>
        <meta name="description" content="Analyze GitHub users and view their repositories" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-2">
              GitHub User Analyzer
            </h1>
            <p className="text-gray-300 text-lg">
              Search for GitHub users and explore their profile and repositories
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && <Loading />}

          {/* User Profile */}
          {user && !loading && (
            <>
              <UserCard user={user} />

              {/* Repositories */}
              <div className="mt-12">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Top Repositories
                </h2>
                {repos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {repos.map((repo) => (
                      <RepositoryCard key={repo.name} repo={repo} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No repositories found</p>
                )}
              </div>
            </>
          )}

          {/* Initial State Message */}
          {!user && !loading && !error && (
            <div className="text-center mt-12 text-gray-400">
              <p className="text-lg">Search for a GitHub user to get started</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
