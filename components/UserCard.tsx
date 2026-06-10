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

interface UserCardProps {
  user: GitHubUser
}

export default function UserCard({ user }: UserCardProps) {
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-8 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-32 h-32 rounded-full border-4 border-blue-500"
            />
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-3xl font-bold text-white mb-1">
                {user.name || user.login}
              </h2>
              <p className="text-blue-400 text-lg">@{user.login}</p>
            </div>

            {user.bio && (
              <p className="text-gray-300 mb-4 text-lg">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-600/50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {user.public_repos}
                </div>
                <div className="text-sm text-gray-400">Repositories</div>
              </div>
              <div className="bg-slate-600/50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {user.followers}
                </div>
                <div className="text-sm text-gray-400">Followers</div>
              </div>
              <div className="bg-slate-600/50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {user.following}
                </div>
                <div className="text-sm text-gray-400">Following</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-300">
              {user.company && (
                <p>
                  <span className="text-gray-500">Company:</span> {user.company}
                </p>
              )}
              {user.location && (
                <p>
                  <span className="text-gray-500">Location:</span> {user.location}
                </p>
              )}
              {user.blog && (
                <p>
                  <span className="text-gray-500">Website:</span>{' '}
                  <a
                    href={user.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {user.blog}
                  </a>
                </p>
              )}
              {user.twitter_username && (
                <p>
                  <span className="text-gray-500">Twitter:</span>{' '}
                  <a
                    href={`https://twitter.com/${user.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    @{user.twitter_username}
                  </a>
                </p>
              )}
              <p>
                <span className="text-gray-500">Joined:</span> {joinDate}
              </p>
            </div>

            {/* GitHub Link */}
            <div className="mt-6">
              <a
                href={user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
