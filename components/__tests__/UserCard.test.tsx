/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserCard from '@/components/UserCard'
import type { GitHubUser } from '@/types/github'

function buildUser(overrides: Partial<GitHubUser> = {}): GitHubUser {
  return {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'Building things on GitHub.',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    public_repos: 42,
    followers: 1500,
    following: 12,
    created_at: '2011-01-25T18:44:36Z',
    updated_at: '2026-01-01T00:00:00Z',
    location: 'San Francisco',
    blog: 'https://github.blog',
    twitter_username: 'github',
    company: '@github',
    html_url: 'https://github.com/octocat',
    ...overrides,
  }
}

beforeEach(() => {
  // UserCard renders FavoriteButton, which syncs from localStorage on mount.
  window.localStorage.clear()
})

describe('UserCard profile rendering', () => {
  it('renders the display name, handle, and bio', () => {
    render(<UserCard user={buildUser()} />)

    expect(
      screen.getByRole('heading', { name: 'The Octocat' })
    ).toBeInTheDocument()
    expect(screen.getByText('@octocat')).toBeInTheDocument()
    expect(screen.getByText('Building things on GitHub.')).toBeInTheDocument()
  })

  it('renders the avatar with the login as its alt text', () => {
    render(<UserCard user={buildUser()} />)

    const avatar = screen.getByAltText('octocat')
    expect(avatar).toBeInTheDocument()
  })

  it('renders the repo, follower, and following counts', () => {
    render(
      <UserCard
        user={buildUser({ public_repos: 42, followers: 1500, following: 12 })}
      />
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('1500')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('falls back to the login when the user has no display name', () => {
    render(<UserCard user={buildUser({ name: '' })} />)

    // Both the heading and the handle now read from `login`.
    expect(screen.getByRole('heading', { name: 'octocat' })).toBeInTheDocument()
    expect(screen.getByText('@octocat')).toBeInTheDocument()
  })

  it('omits the optional fields a profile has not filled in', () => {
    render(
      <UserCard user={buildUser({ bio: '', company: '', location: '' })} />
    )

    expect(
      screen.queryByText('Building things on GitHub.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/company:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/location:/i)).not.toBeInTheDocument()
    // The identity still renders — an empty bio must not blank the card.
    expect(
      screen.getByRole('heading', { name: 'The Octocat' })
    ).toBeInTheDocument()
  })

  it('renders company and location when present', () => {
    render(
      <UserCard
        user={buildUser({ company: '@github', location: 'San Francisco' })}
      />
    )

    // The label and its value are separate nodes (`<span>Company:</span> {value}`),
    // and a bare "@github" also appears elsewhere on the card — so assert against the
    // labelled row rather than the raw string.
    expect(screen.getByText('Company:').parentElement).toHaveTextContent(
      '@github'
    )
    expect(screen.getByText('Location:').parentElement).toHaveTextContent(
      'San Francisco'
    )
  })

  it('does not mount the followers explorer until it is opened', () => {
    // It is behind `showFollowers`, so the card must not fetch follower data just
    // because a profile rendered.
    render(<UserCard user={buildUser()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
