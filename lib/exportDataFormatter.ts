import type { UserData } from '@/types/github'

/** Selectable sections of a profile export. */
export type ExportSection =
  | 'profile'
  | 'repositories'
  | 'contributions'
  | 'engagement'
  | 'productivity'

/** All sections, in the canonical output order. */
export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  'profile',
  'contributions',
  'engagement',
  'productivity',
  'repositories',
]

/**
 * Serializes a profile to pretty-printed JSON. When `sections` is omitted, every
 * section is included and the output is identical to the full-profile export;
 * pass a subset to export only those sections.
 */
export function formatAsJSON(
  userData: UserData,
  sections: ExportSection[] = ALL_EXPORT_SECTIONS
): string {
  const include = new Set(sections)
  const out: Record<string, unknown> = {}

  if (include.has('profile')) {
    out.username = userData.user.login
    out.name = userData.user.name
    out.bio = userData.user.bio
    out.publicReposCount = userData.user.public_repos
    out.followers = userData.user.followers
    out.following = userData.user.following
  }
  if (include.has('contributions')) {
    out.totalContributions = userData.contributions?.totalContributions || 0
  }
  if (include.has('engagement')) {
    out.engagement = userData.engagement || null
  }
  if (include.has('productivity')) {
    out.productivity = userData.productivity || null
  }
  if (include.has('repositories')) {
    out.repositories = (userData.repos || []).map((repo) => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }))
  }

  return JSON.stringify(out, null, 2)
}

/** Escapes a value for use inside a Markdown table cell: pipes are escaped and
 *  newlines collapsed so a value can never break the table row. */
function escapeMarkdownCell(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

/**
 * Renders a profile as a portable Markdown document: a header (name, handle,
 * bio), a stats block, and a table of the top repositories by stars. Suitable
 * for pasting into a README or Gist.
 */
export function formatAsMarkdown(userData: UserData): string {
  const user = userData.user
  const lines: string[] = []

  lines.push(`# ${escapeMarkdownCell(user.name || user.login)} (@${user.login})`)
  lines.push('')
  if (user.bio) {
    lines.push(`> ${escapeMarkdownCell(user.bio)}`)
    lines.push('')
  }

  const totalStars = (userData.repos || []).reduce(
    (sum, repo) => sum + (repo.stargazers_count || 0),
    0
  )

  lines.push('## Stats')
  lines.push('')
  lines.push(`- **Followers:** ${user.followers}`)
  lines.push(`- **Following:** ${user.following}`)
  lines.push(`- **Public repositories:** ${user.public_repos}`)
  lines.push(`- **Total stars:** ${totalStars}`)
  if (userData.contributions?.totalContributions) {
    lines.push(`- **Total contributions:** ${userData.contributions.totalContributions}`)
  }
  lines.push('')

  const topRepos = [...(userData.repos || [])]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 10)

  if (topRepos.length > 0) {
    lines.push('## Top Repositories')
    lines.push('')
    lines.push('| Repository | Stars | Language | Description |')
    lines.push('| --- | --- | --- | --- |')
    for (const repo of topRepos) {
      const name = escapeMarkdownCell(repo.name)
      const linked = repo.html_url ? `[${name}](${repo.html_url})` : name
      lines.push(
        `| ${linked} | ${repo.stargazers_count || 0} | ${escapeMarkdownCell(repo.language) || '—'} | ${escapeMarkdownCell(repo.description) || '—'} |`
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}
