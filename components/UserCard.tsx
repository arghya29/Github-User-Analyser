import { useState, memo } from "react";
import Image from "next/image";
import type { GitHubUser } from "@/types/github";
import FollowersExplorer from "@/components/FollowersExplorer";
import FavoriteButton from "@/components/FavoriteButton";

interface UserCardProps {
  user: GitHubUser;
}

function UserCard({ user }: UserCardProps) {
  const [showFollowers, setShowFollowers] = useState(false);
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-8 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Image
              src={user.avatar_url}
              alt={user.login}
              width={128}
              height={128}
              className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover"
            />
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {user.name || user.login}
                </h2>
                <FavoriteButton username={user.login} />
              </div>
              <p className="text-blue-600 dark:text-blue-400 text-lg">
                @{user.login}
              </p>
            </div>

            {user.bio && (
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">
                {user.bio}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 dark:bg-slate-600/50 rounded p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.public_repos}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Repositories
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFollowers(true)}
                className="bg-gray-100 dark:bg-slate-600/50 rounded p-4 text-center hover:bg-gray-200 dark:hover:bg-slate-500/50 transition-colors cursor-pointer"
              >
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.followers}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Followers
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowFollowers(true)}
                className="bg-gray-100 dark:bg-slate-600/50 rounded p-4 text-center hover:bg-gray-200 dark:hover:bg-slate-500/50 transition-colors cursor-pointer"
              >
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.following}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Following
                </div>
              </button>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {user.company && (
                <p>
                  <span className="text-gray-500 dark:text-gray-500">
                    Company:
                  </span>{" "}
                  {user.company}
                </p>
              )}
              {user.location && (
                <p>
                  <span className="text-gray-500 dark:text-gray-500">
                    Location:
                  </span>{" "}
                  {user.location}
                </p>
              )}
              {user.blog && (
                <p>
                  <span className="text-gray-500 dark:text-gray-500">
                    Website:
                  </span>{" "}
                  <a
                    href={user.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {user.blog}
                  </a>
                </p>
              )}
              {user.twitter_username && (
                <p>
                  <span className="text-gray-500 dark:text-gray-500">
                    Twitter:
                  </span>{" "}
                  <a
                    href={`https://twitter.com/${user.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    @{user.twitter_username}
                  </a>
                </p>
              )}
              <p>
                <span className="text-gray-500 dark:text-gray-500">
                  Joined:
                </span>{" "}
                {joinDate}
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
      {showFollowers && (
        <FollowersExplorer
          username={user.login}
          followersCount={user.followers}
          followingCount={user.following}
          onClose={() => setShowFollowers(false)}
        />
      )}
    </div>
  );
}

// static profile summary; nothing about it changes while the user filters repos.
export default memo(UserCard);
