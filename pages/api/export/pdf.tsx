import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
  Link,
} from '@react-pdf/renderer'
import axios from 'axios'
import type { UserData } from '@/types/github'
import { getCached } from '@/lib/cache'

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE = '#2563eb'
const DARK = '#0f172a'
const MID = '#334155'
const LIGHT = '#64748b'
const PALE = '#f1f5f9'
const WHITE = '#ffffff'
const GREEN = '#16a34a'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: WHITE,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 10,
    color: DARK,
    lineHeight: 1.4,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 18,
    border: `3px solid ${BLUE}`,
  },
  headerRight: { flex: 1 },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 2,
  },
  username: { fontSize: 12, color: BLUE, marginBottom: 6 },
  bio: { fontSize: 10, color: MID, marginBottom: 8, lineHeight: 1.5 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  contactText: { fontSize: 9, color: LIGHT },
  contactLink: { fontSize: 9, color: BLUE, textDecoration: 'none' },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: PALE,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 2,
  },
  statLabel: { fontSize: 8, color: LIGHT, textAlign: 'center' },

  // ── Section ──
  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0', marginLeft: 8 },

  // ── Language bars ──
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALE,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  langDot: { width: 6, height: 6, borderRadius: 3 },
  langText: { fontSize: 9, color: MID },

  // ── Productivity ──
  prodRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  prodBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  prodNum: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK },
  prodLabel: { fontSize: 8, color: LIGHT, marginTop: 1 },

  // ── Repo entries ──
  repoEntry: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  repoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  repoName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  repoLang: {
    fontSize: 8,
    color: WHITE,
    backgroundColor: BLUE,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  repoDesc: { fontSize: 9, color: MID, marginBottom: 4, lineHeight: 1.4 },
  repoStats: { flexDirection: 'row', gap: 12 },
  repoStat: { fontSize: 8, color: LIGHT },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 8, color: LIGHT },
  footerBadge: {
    backgroundColor: BLUE,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  footerBadgeText: { fontSize: 8, color: WHITE, fontFamily: 'Helvetica-Bold' },
})

// ── Language colour map (keep in sync with languageColors.ts) ─────────────────
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#eab308',
  TypeScript: '#2563eb',
  Python: '#60a5fa',
  Java: '#dc2626',
  Go: '#06b6d4',
  Rust: '#c2410c',
  'C++': '#1e40af',
  C: '#4b5563',
  CSS: '#ec4899',
  HTML: '#ef4444',
  Shell: '#374151',
  Ruby: '#b91c1c',
}

// ── Fetch avatar as base64 ────────────────────────────────────────────────────
async function avatarToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 })
    const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } catch {
    return null
  }
}

// ── Resume document ───────────────────────────────────────────────────────────
interface ResumeDocProps {
  userData: UserData
  avatarDataUrl: string | null
}

function ResumeDocument({ userData, avatarDataUrl }: ResumeDocProps) {
  const { user, repos, contributions, engagement, productivity } = userData

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })

  // Top 6 repos by stars
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)

  // Language distribution
  const langCounts = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.language) continue
    langCounts.set(repo.language, (langCounts.get(repo.language) || 0) + 1)
  }
  const topLangs = Array.from(langCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)

  return (
    <Document
      title={`${user.name || user.login} - GitHub Profile`}
      author="GitHub User Analyzer"
      subject="Developer Profile"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {avatarDataUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.avatar} src={avatarDataUrl} />
          )}
          <View style={styles.headerRight}>
            <Text style={styles.name}>{user.name || user.login}</Text>
            <Text style={styles.username}>@{user.login}</Text>
            {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
            <View style={styles.contactRow}>
              {user.location ? (
                <View style={styles.contactItem}>
                  <Text style={styles.contactText}>{user.location}</Text>
                </View>
              ) : null}
              {user.blog ? (
                <View style={styles.contactItem}>
                  <Link style={styles.contactLink} src={user.blog}>{user.blog}</Link>
                </View>
              ) : null}
              {user.twitter_username ? (
                <View style={styles.contactItem}>
                  <Link style={styles.contactLink} src={`https://twitter.com/${user.twitter_username}`}>
                    @{user.twitter_username}
                  </Link>
                </View>
              ) : null}
              <View style={styles.contactItem}>
                <Link style={styles.contactLink} src={user.html_url}>{user.html_url}</Link>
              </View>
              <View style={styles.contactItem}>
                <Text style={styles.contactText}>Joined {joinDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user.public_repos}</Text>
            <Text style={styles.statLabel}>Repositories</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalStars}</Text>
            <Text style={styles.statLabel}>Total Stars</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalForks}</Text>
            <Text style={styles.statLabel}>Total Forks</Text>
          </View>
          {contributions ? (
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{contributions.totalContributions}</Text>
              <Text style={styles.statLabel}>Contributions{'\n'}(last year)</Text>
            </View>
          ) : null}
        </View>

        {/* ── Languages ── */}
        {topLangs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Languages & Technologies</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.langRow}>
              {topLangs.map(([lang, count]) => (
                <View key={lang} style={styles.langPill}>
                  <View style={[styles.langDot, { backgroundColor: LANG_COLORS[lang] || '#94a3b8' }]} />
                  <Text style={styles.langText}>{lang} ({count})</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Productivity (only if GraphQL data was available) ── */}
        {productivity && engagement && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Productivity (last year)</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.prodRow}>
              <View style={styles.prodBox}>
                <Text style={styles.prodNum}>{engagement.totalCommitContributions}</Text>
                <Text style={styles.prodLabel}>Commits</Text>
              </View>
              <View style={styles.prodBox}>
                <Text style={styles.prodNum}>{engagement.totalPullRequestContributions}</Text>
                <Text style={styles.prodLabel}>Pull Requests</Text>
              </View>
              <View style={styles.prodBox}>
                <Text style={styles.prodNum}>{engagement.totalIssueContributions}</Text>
                <Text style={styles.prodLabel}>Issues</Text>
              </View>
              <View style={styles.prodBox}>
                <Text style={{ ...styles.prodNum, color: GREEN }}>{productivity.currentStreak}</Text>
                <Text style={styles.prodLabel}>Current Streak (days)</Text>
              </View>
              <View style={styles.prodBox}>
                <Text style={styles.prodNum}>{productivity.longestStreak}</Text>
                <Text style={styles.prodLabel}>Longest Streak</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Top Repositories ── */}
        {topRepos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Repositories</Text>
              <View style={styles.sectionLine} />
            </View>
            {topRepos.map((repo) => (
              <View key={repo.name} style={styles.repoEntry}>
                <View style={styles.repoTop}>
                  <Link src={repo.html_url} style={styles.repoName}>{repo.name}</Link>
                  {repo.language ? (
                    <Text style={styles.repoLang}>{repo.language}</Text>
                  ) : null}
                </View>
                {repo.description ? (
                  <Text style={styles.repoDesc}>{repo.description}</Text>
                ) : null}
                <View style={styles.repoStats}>
                  <Text style={styles.repoStat}>★ {repo.stargazers_count} stars</Text>
                  <Text style={styles.repoStat}>⑂ {repo.forks_count} forks</Text>
                  {typeof repo.open_issues_count === 'number' && (
                    <Text style={styles.repoStat}>◎ {repo.open_issues_count} open issues</Text>
                  )}
                  <Text style={styles.repoStat}>
                    Updated {new Date(repo.updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated by GitHub User Analyzer · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <View style={styles.footerBadge}>
            <Text style={styles.footerBadgeText}>github-user-analyser.vercel.app</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ── API handler ───────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = req.query
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' })
  }

  // Re-use the cached profile data if it exists — if not, we'd need a fresh
  // fetch. For simplicity the frontend passes the data it already has as POST body.
  let userData: UserData | null = null

  if (req.method === 'POST') {
    try {
      userData = req.body as UserData
    } catch {
      userData = null
    }
  }

  if (!userData) {
    const cacheKey = `github-profile:${username.toLowerCase()}`
    userData = getCached<UserData>(cacheKey)
  }

  if (!userData || !userData.user?.login) {
    return res.status(404).json({ error: 'Profile data not found. Search for the user first.' })
  }

  try {
    const avatarDataUrl = await avatarToDataUrl(userData.user.avatar_url)
    const element =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(ResumeDocument, { userData, avatarDataUrl }) as any
    const buffer = await renderToBuffer(element)

    const safeLogin = userData.user.login.replace(/[^a-zA-Z0-9_-]/g, '')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeLogin}-github-profile.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    res.status(200).end(buffer)
  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
}