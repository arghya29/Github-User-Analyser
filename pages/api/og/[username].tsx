import { ImageResponse } from '@vercel/og'
import { sanitizeUsername } from '@/lib/validation'

// @vercel/og requires the edge runtime.
export const config = { runtime: 'edge' }

interface OgUser {
  name: string | null
  login: string
  avatarUrl: string
  followers: number
  following: number
  publicRepos: number
}

async function fetchUser(username: string): Promise<OgUser | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'github-user-analyser',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.login) return null
    return {
      name: data.name ?? null,
      login: data.login,
      avatarUrl: data.avatar_url,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
      publicRepos: data.public_repos ?? 0,
    }
  } catch {
    return null
  }
}

const BACKGROUND = 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)'

/** A branded, non-personalized fallback served when the username is invalid or
 *  the GitHub lookup fails — crawlers get a valid 1200x630 image, never a 500. */
function fallbackCard(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: BACKGROUND,
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 700, color: '#ffffff' }}>GitHub User Analyser</div>
      <div style={{ fontSize: 36, color: '#8b949e', marginTop: 16 }}>
        Analyze any GitHub profile
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}

function stat(value: number, label: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginRight: 72 }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: '#ffffff' }}>{value}</div>
      <div style={{ fontSize: 28, color: '#8b949e', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default async function handler(request: Request): Promise<ImageResponse> {
  const url = new URL(request.url)
  const rawSegment = url.pathname.split('/').filter(Boolean).pop() ?? ''
  let decoded = ''
  try {
    decoded = decodeURIComponent(rawSegment)
  } catch {
    decoded = rawSegment
  }
  const username = sanitizeUsername(decoded)

  if (!username) return fallbackCard()

  const user = await fetchUser(username)
  if (!user) return fallbackCard()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BACKGROUND,
        padding: 80,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatarUrl}
          width={200}
          height={200}
          alt=""
          style={{ borderRadius: 100, border: '4px solid #30363d' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 48 }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#ffffff' }}>
            {user.name || user.login}
          </div>
          <div style={{ fontSize: 36, color: '#8b949e', marginTop: 8 }}>@{user.login}</div>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {stat(user.followers, 'Followers')}
        {stat(user.publicRepos, 'Repositories')}
        {stat(user.following, 'Following')}
      </div>

      <div style={{ display: 'flex', fontSize: 28, color: '#58a6ff' }}>GitHub User Analyser</div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        // Deterministic per user, so cache aggressively at the CDN.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
