/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchBar from '@/components/SearchBar'

// SearchBar builds its suggestion pool from the real `getFavorites()` and
// `loadHistory()` helpers, both of which read window.localStorage. jsdom provides
// localStorage, so seeding it exercises the real code path rather than mocking the
// modules out — which also means these tests would catch a break in that wiring.
const HISTORY_KEY = 'github-analyzer-history'
const FAVORITES_KEY = 'github-analyzer-favorites'

function seedStorage({ history = [], favorites = [] }: { history?: string[]; favorites?: string[] }) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('SearchBar rendering', () => {
  it('renders an accessible search input and submit button', () => {
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    const input = screen.getByRole('combobox', { name: /github username/i })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter GitHub username...')
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('disables the submit button until something is typed', () => {
    render(<SearchBar onSearch={jest.fn()} loading={false} />)
    const button = screen.getByRole('button', { name: /search/i })

    expect(button).toBeDisabled()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'octocat' } })
    expect(button).toBeEnabled()
  })

  it('ignores a whitespace-only query (the button stays disabled)', () => {
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled()
  })

  it('shows a loading state and blocks input while a search is in flight', () => {
    render(<SearchBar onSearch={jest.fn()} loading={true} />)

    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

describe('SearchBar submission', () => {
  it('calls onSearch with the typed username on submit', () => {
    const onSearch = jest.fn()
    render(<SearchBar onSearch={onSearch} loading={false} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'octocat' } })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('octocat')
  })

  it('passes the raw input up untrimmed, leaving validation to the parent', () => {
    // The component deliberately forwards the input as-is so the page can surface
    // its own validation error; it does not silently "fix" the query.
    const onSearch = jest.fn()
    render(<SearchBar onSearch={onSearch} loading={false} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '  octocat  ' } })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(onSearch).toHaveBeenCalledWith('  octocat  ')
  })
})

describe('SearchBar suggestions', () => {
  it('offers favorites before history, de-duplicated case-insensitively', () => {
    seedStorage({ favorites: ['octocat'], history: ['OCTOCAT', 'torvalds'] })
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    fireEvent.focus(screen.getByRole('combobox'))

    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    // "OCTOCAT" is dropped as a case-insensitive duplicate of the favorite.
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('octocat')
    expect(options[1]).toHaveTextContent('torvalds')
  })

  it('does not open a dropdown when there is nothing to suggest', () => {
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    fireEvent.focus(screen.getByRole('combobox'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false')
  })

  it('filters suggestions as the user types, and marks the listbox expanded', () => {
    seedStorage({ history: ['octocat', 'torvalds', 'gaearon'] })
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'tor' } })

    expect(input).toHaveAttribute('aria-expanded', 'true')
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('torvalds')
  })

  it('caps the list at 8 suggestions', () => {
    // Favorites are the only pool large enough to hit SearchBar's cap: loadHistory()
    // applies its own MAX_HISTORY = 5 limit on read, so history alone can never
    // exceed 5 entries no matter how many were stored.
    seedStorage({ favorites: Array.from({ length: 12 }, (_, i) => `user${i}`) })
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    fireEvent.focus(screen.getByRole('combobox'))

    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(8)
  })

  it('surfaces at most 5 history entries, per loadHistory()\'s own cap', () => {
    seedStorage({ history: Array.from({ length: 20 }, (_, i) => `user${i}`) })
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    fireEvent.focus(screen.getByRole('combobox'))

    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(5)
  })

  it('searches for a suggestion when it is clicked', () => {
    const onSearch = jest.fn()
    seedStorage({ history: ['octocat', 'torvalds'] })
    render(<SearchBar onSearch={onSearch} loading={false} />)

    fireEvent.focus(screen.getByRole('combobox'))
    // mouseDown, not click: the component listens for mouseDown so the input blur
    // can't close the list before the selection lands.
    fireEvent.mouseDown(screen.getByRole('option', { name: 'torvalds' }))

    expect(onSearch).toHaveBeenCalledWith('torvalds')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('SearchBar keyboard navigation', () => {
  it('selects a suggestion with ArrowDown then Enter', () => {
    const onSearch = jest.fn()
    seedStorage({ history: ['octocat', 'torvalds'] })
    render(<SearchBar onSearch={onSearch} loading={false} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSearch).toHaveBeenCalledWith('octocat')
  })

  it('wraps around when arrowing past the end of the list', () => {
    const onSearch = jest.fn()
    seedStorage({ history: ['octocat', 'torvalds'] })
    render(<SearchBar onSearch={onSearch} loading={false} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // -> octocat
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // -> torvalds
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // wraps -> octocat
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSearch).toHaveBeenCalledWith('octocat')
  })

  it('marks the highlighted option via aria-activedescendant', () => {
    seedStorage({ history: ['octocat', 'torvalds'] })
    render(<SearchBar onSearch={jest.fn()} loading={false} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(input).not.toHaveAttribute('aria-activedescendant')

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    const active = input.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(screen.getByRole('option', { name: 'octocat' })).toHaveAttribute('id', active!)
    expect(screen.getByRole('option', { name: 'octocat' })).toHaveAttribute('aria-selected', 'true')
  })

  it('closes the dropdown on Escape without searching', () => {
    const onSearch = jest.fn()
    seedStorage({ history: ['octocat'] })
    render(<SearchBar onSearch={onSearch} loading={false} />)

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSearch).not.toHaveBeenCalled()
  })
})
