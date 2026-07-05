import type { UserData } from '@/types/github'

export function formatAsJSON(userData: UserData): string {
  return JSON.stringify(
    {
      username: userData.user.login,
      name: userData.user.name,
      bio: userData.user.bio,
      publicReposCount: userData.user.public_repos,
      followers: userData.user.followers,
      following: userData.user.following,
      totalContributions: userData.contributions?.totalContributions || 0,
      engagement: userData.engagement || null,
      productivity: userData.productivity || null,
      repositories: (userData.repos || []).map((repo) => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
      })),
    },
    null,
    2
  )
}
