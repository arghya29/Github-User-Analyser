import axios from 'axios'
import { fetchUserActivity } from '@/lib/activity'
import { fetchCommitActivity } from '@/lib/commitActivity'
import { fetchSponsors } from '@/lib/sponsors'
import { fetchStarHistory } from '@/lib/starHistory'
import { fetchFollowersOrFollowing } from '@/lib/followers'

/**
 * Tests for the client-side API wrappers.
 *
 * These five modules are near-identical by design — each is one `axios.get`
 * against its own route, returning `response.data`. They are covered together
 * because separate files would be five copies of the same assertions, and
 * because the two things worth pinning down are shared by all of them:
 *
 *  1. Parameters are URL-encoded. A repository named `c++` or a username
 *     containing a slash would otherwise change which route is hit, or break
 *     the query string entirely.
 *
 *  2. Every wrapper passes `validateStatus: () => true`, so axios resolves on
 *     4xx and 5xx instead of throwing. The API routes answer errors with
 *     `{ error, errorType }`, so on failure these functions return that object
 *     while their signature says `Promise<T[]>`. A caller doing `.map()` on the
 *     result gets a TypeError rather than a handled error. That is the real
 *     behaviour, and the tests below record it rather than assert what the
 *     types claim.
 */

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

/** The URL each wrapper requested on its most recent call. */
const requestedUrl = () => String(mockedAxios.get.mock.calls[0][0])

/** The config each wrapper passed. */
const requestedConfig = () => mockedAxios.get.mock.calls[0][1]

beforeEach(() => {
  jest.clearAllMocks()
})

/**
 * Every wrapper shares the same shape, so the common guarantees are asserted
 * once per module through this table rather than duplicated five times.
 */
const wrappers = [
  {
    name: 'fetchUserActivity',
    route: '/api/activity',
    call: () => fetchUserActivity('octocat'),
    callWith: (value: string) => fetchUserActivity(value),
    expectedUrl: '/api/activity?username=octocat',
  },
  {
    name: 'fetchCommitActivity',
    route: '/api/commit-activity',
    call: () => fetchCommitActivity('facebook', 'react'),
    callWith: (value: string) => fetchCommitActivity(value, 'react'),
    expectedUrl: '/api/commit-activity?owner=facebook&repo=react',
  },
  {
    name: 'fetchSponsors',
    route: '/api/sponsors',
    call: () => fetchSponsors('octocat'),
    callWith: (value: string) => fetchSponsors(value),
    expectedUrl: '/api/sponsors?username=octocat',
  },
  {
    name: 'fetchStarHistory',
    route: '/api/star-history',
    call: () => fetchStarHistory('facebook', 'react'),
    callWith: (value: string) => fetchStarHistory(value, 'react'),
    expectedUrl: '/api/star-history?owner=facebook&repo=react',
  },
  {
    name: 'fetchFollowersOrFollowing',
    route: '/api/followers',
    call: () => fetchFollowersOrFollowing('octocat', 'followers'),
    callWith: (value: string) => fetchFollowersOrFollowing(value, 'followers'),
    expectedUrl: '/api/followers?username=octocat&type=followers',
  },
] as const

describe.each(wrappers)('$name', ({ call, callWith, expectedUrl, route }) => {
  it('requests its own route with the expected query string', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await call()
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    expect(requestedUrl()).toBe(expectedUrl)
  })

  it('returns response.data unchanged', async () => {
    const payload = [{ id: 1 }, { id: 2 }]
    mockedAxios.get.mockResolvedValue({ data: payload })
    await expect(call()).resolves.toBe(payload)
  })

  it('returns an empty array as-is', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await expect(call()).resolves.toEqual([])
  })

  it('accepts any HTTP status rather than throwing', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await call()
    const validateStatus = requestedConfig()?.validateStatus
    expect(typeof validateStatus).toBe('function')
    // Without this, axios rejects on 4xx/5xx and every caller needs a
    // try/catch. With it, the error body flows back as data instead.
    for (const status of [200, 304, 400, 401, 403, 404, 429, 500, 503]) {
      expect(validateStatus?.(status)).toBe(true)
    }
  })

  it('encodes a slash so it cannot alter the request path', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await callWith('evil/../../admin')
    expect(requestedUrl()).toContain('%2F')
    // The path itself must still be the intended route.
    expect(requestedUrl().split('?')[0]).toBe(route)
  })

  it('encodes an ampersand so it cannot inject another parameter', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await callWith('a&type=admin')
    expect(requestedUrl()).toContain('%26')
  })

  it('encodes spaces and hashes', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await callWith('a b#c')
    const url = requestedUrl()
    expect(url).toContain('%20')
    expect(url).toContain('%23')
    expect(url).not.toContain(' ')
  })

  it('propagates a transport error', async () => {
    // validateStatus only suppresses HTTP status rejection. A genuine network
    // failure still rejects, and callers need to know that reaches them.
    mockedAxios.get.mockRejectedValue(new Error('Network Error'))
    await expect(call()).rejects.toThrow('Network Error')
  })

  it('returns the error body on a failed request, not an array', async () => {
    // The documented consequence of validateStatus: () => true. The signature
    // says Promise<T[]>, but a 404 resolves with the route's error object, so
    // a caller calling .map() on it throws.
    const errorBody = { error: 'User not found', errorType: 'not_found' }
    mockedAxios.get.mockResolvedValue({ data: errorBody, status: 404 })
    const result = await call()
    expect(result).toEqual(errorBody)
    expect(Array.isArray(result)).toBe(false)
  })
})

describe('fetchCommitActivity — both parameters', () => {
  it('encodes the repo as well as the owner', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await fetchCommitActivity('my org', 'c++ helper')
    const url = requestedUrl()
    expect(url).toBe('/api/commit-activity?owner=my%20org&repo=c%2B%2B%20helper')
  })
})

describe('fetchStarHistory — both parameters', () => {
  it('encodes the repo as well as the owner', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await fetchStarHistory('my org', 'c++ helper')
    expect(requestedUrl()).toBe('/api/star-history?owner=my%20org&repo=c%2B%2B%20helper')
  })
})

describe('fetchFollowersOrFollowing — the type parameter', () => {
  it('passes followers through', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await fetchFollowersOrFollowing('octocat', 'followers')
    expect(requestedUrl()).toBe('/api/followers?username=octocat&type=followers')
  })

  it('passes following through', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    await fetchFollowersOrFollowing('octocat', 'following')
    expect(requestedUrl()).toBe('/api/followers?username=octocat&type=following')
  })

  it('is the one parameter not encoded, which the union type is what protects', async () => {
    // `type` is interpolated raw. That is safe only because its type is
    // 'followers' | 'following' — worth recording, since widening that union
    // later would open a query-injection hole with no other guard.
    mockedAxios.get.mockResolvedValue({ data: [] })
    await fetchFollowersOrFollowing('octocat', 'following')
    expect(requestedUrl().endsWith('&type=following')).toBe(true)
  })
})
