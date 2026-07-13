import { formatAsMarkdown } from '@/lib/exportDataFormatter'
import type { UserData } from '@/types/github'

function userData(overrides: Record<string, unknown> = {}): UserData {
  return {
    user: {
      login: 'octocat',
      name: 'The Octocat',
      bio: 'Building things',
      public_repos: 2,
      followers: 100,
      following: 10,
    },
    repos: [
      {
        name: 'big',
        description: 'the popular one',
        stargazers_count: 50,
        forks_count: 4,
        language: 'TypeScript',
        updated_at: 'x',
        html_url: 'https://github.com/octocat/big',
      },
      {
        name: 'small',
        description: 'a little one',
        stargazers_count: 5,
        forks_count: 0,
        language: 'Go',
        updated_at: 'x',
        html_url: 'https://github.com/octocat/small',
      },
    ],
    contributions: { totalContributions: 100 },
    engagement: null,
    productivity: null,
    ...overrides,
  } as unknown as UserData
}

describe('formatAsMarkdown', () => {
  it('renders a header, stats block, and a top-repositories table', () => {
    const md = formatAsMarkdown(userData())
    expect(md).toContain('# The Octocat (@octocat)')
    expect(md).toContain('> Building things')
    expect(md).toContain('## Stats')
    expect(md).toContain('- **Followers:** 100')
    expect(md).toContain('- **Total stars:** 55') // 50 + 5
    expect(md).toContain('## Top Repositories')
    expect(md).toContain('| Repository | Stars | Language | Description |')
    expect(md).toContain('[big](https://github.com/octocat/big)')
  })

  it('sorts repositories by stars descending', () => {
    const md = formatAsMarkdown(userData())
    expect(md.indexOf('[big]')).toBeLessThan(md.indexOf('[small]'))
  })

  it('escapes pipe characters so a description cannot break the table', () => {
    const md = formatAsMarkdown(
      userData({
        repos: [
          {
            name: 'weird',
            description: 'has | a pipe',
            stargazers_count: 1,
            forks_count: 0,
            language: 'JS',
            updated_at: 'x',
            html_url: 'https://github.com/octocat/weird',
          },
        ],
      })
    )
    expect(md).toContain('has \\| a pipe')
    expect(md).not.toContain('has | a pipe')
  })

  it('escapes a backslash before a pipe so the pipe stays escaped', () => {
    const md = formatAsMarkdown(
      userData({
        repos: [
          {
            name: 'weird',
            description: 'a\\|b',
            stargazers_count: 1,
            forks_count: 0,
            language: 'JS',
            updated_at: 'x',
            html_url: 'https://github.com/octocat/weird',
          },
        ],
      })
    )
    // Backslash is escaped first (\ -> \\), then the pipe (| -> \|), giving three
    // backslashes before the pipe. The pipe is therefore preceded by an even number
    // of literal backslashes plus its own escape, so it can never act as a delimiter.
    expect(md).toContain('a\\\\\\|b')
  })

  it('does not throw when there are no repositories', () => {
    const md = formatAsMarkdown(userData({ repos: [] }))
    expect(md).toContain('## Stats')
    expect(md).not.toContain('## Top Repositories')
  })
})
