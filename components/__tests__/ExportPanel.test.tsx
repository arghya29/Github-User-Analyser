/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ExportPanel from '@/components/ExportPanel'
import type { UserData } from '@/types/github'

const originalCreateElement = document.createElement.bind(document)
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

const baseUserData: UserData = {
  user: {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'Hello',
    avatar_url: 'https://example.com/avatar.png',
    public_repos: 1,
    followers: 1,
    following: 1,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    location: '',
    blog: '',
    twitter_username: '',
    company: '',
    html_url: 'https://github.com/octocat',
  },
  repos: [],
  contributions: null,
  engagement: null,
  productivity: null,
}

describe('ExportPanel', () => {
  it('does not throw when download helpers run without document support', () => {
    const anchorStub = {
      set href(value: string) {},
      set download(value: string) {},
      click() {},
    }

    Object.defineProperty(document, 'createElement', {
      configurable: true,
      value: (tagName: string) => {
        if (tagName.toLowerCase() === 'a') {
          return anchorStub as unknown as HTMLElement
        }
        return originalCreateElement(tagName)
      },
    })
    URL.createObjectURL = jest.fn(() => 'blob:mock')
    URL.revokeObjectURL = jest.fn()

    try {
      render(<ExportPanel userData={baseUserData} />)
      fireEvent.click(
        screen.getByRole('button', { name: /download resume pdf/i })
      )
      fireEvent.click(screen.getByRole('button', { name: /export repos csv/i }))
      fireEvent.click(screen.getByRole('button', { name: /export raw json/i }))
      fireEvent.click(screen.getByRole('button', { name: /export markdown/i }))
    } finally {
      Object.defineProperty(document, 'createElement', {
        configurable: true,
        value: originalCreateElement,
      })
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })
})
