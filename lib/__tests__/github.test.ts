import axios from 'axios'
import { fetchUserData } from '@/lib/github'
import type { UserData } from '@/types/github'

/**
 * Tests for the client-side user fetch.
 *
 * `fetchUserData` is the entry point the search flow depends on, and it does two
 * things worth pinning down:
 *
 *  1. **It resolves on every status.** `validateStatus: () => true` means a 404
 *     or 403 comes back as data rather than a thrown error. Unlike the thinner
 *     wrappers in `lib/`, the route answers failures with a full `UserData`
 *     shape carrying `error` and `errorType`, so the contract holds and callers
 *     branch on `data.error`. That is what lets compare mode show a per-user
 *     message instead of failing the whole page — so the useful assertion is
 *     that the distinct failure kinds stay distinguishable, not that they throw.
 *
 *  2. **It de-duplicates in-flight requests.** A module-level Map keyed on the
 *     lowercased username means two concurrent calls for the same user share one
 *     network request, and the entry is removed in `.finally()`. Nothing
 *     verified either half: a leak there grows unbounded, and a key that missed
 *     the case-fold would silently double every request.
 *
 * Note the deduplication returns the *same underlying* promise but not the same
 * promise object — `fetchUserData` is `async`, so each call wraps it afresh.
 * The tests therefore assert on how many requests were made rather than on
 * object identity.
 */

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

/** A UserData-shaped success payload; only the fields under test are populated. */
const userData = (login: string) =>
  ({
    user: { login },
    repos: [],
    contributions: null,
    engagement: null,
    productivity: null,
  }) as unknown as UserData

/** The shape the API route returns on failure — a UserData carrying an error. */
const errorPayload = (error: string, errorType: string) =>
  ({
    user: {},
    repos: [],
    contributions: null,
    engagement: null,
    productivity: null,
    error,
    errorType,
  }) as unknown as UserData

const requestedUrl = () => String(mockedAxios.get.mock.calls[0][0])

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchUserData — the request', () => {
  it('calls the github route with the username', async () => {
    mockedAxios.get.mockResolvedValue({ data: userData('octocat') })
    await fetchUserData('octocat')
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    expect(requestedUrl()).toBe('/api/github?username=octocat')
  })

  it('encodes the username so it cannot alter the request', async () => {
    mockedAxios.get.mockResolvedValue({ data: userData('x') })
    await fetchUserData('evil/../admin&x=1')
    const url = requestedUrl()
    expect(url).toContain('%2F')
    expect(url).toContain('%26')
    expect(url.split('?')[0]).toBe('/api/github')
  })

  it('preserves the original case in the request', async () => {
    // Only the dedup key is lowercased; the API still receives what was typed.
    mockedAxios.get.mockResolvedValue({ data: userData('Octocat') })
    await fetchUserData('Octocat')
    expect(requestedUrl()).toBe('/api/github?username=Octocat')
  })

  it('resolves on every status rather than throwing', async () => {
    mockedAxios.get.mockResolvedValue({ data: userData('octocat') })
    await fetchUserData('octocat')
    const validateStatus = mockedAxios.get.mock.calls[0][1]?.validateStatus
    expect(typeof validateStatus).toBe('function')
    for (const status of [200, 400, 403, 404, 500, 504]) {
      expect(validateStatus?.(status)).toBe(true)
    }
  })

  it('returns response.data unchanged on success', async () => {
    const payload = userData('octocat')
    mockedAxios.get.mockResolvedValue({ data: payload })
    await expect(fetchUserData('octocat')).resolves.toBe(payload)
  })
})

describe('fetchUserData — how failures are surfaced', () => {
  it('surfaces a missing user as data, not an exception', async () => {
    const payload = errorPayload('User not found', 'not_found')
    mockedAxios.get.mockResolvedValue({ data: payload, status: 404 })
    const result = await fetchUserData('nosuchuser')
    expect(result).toBe(payload)
    expect((result as { error?: string }).error).toBe('User not found')
  })

  it('keeps the failure kinds distinguishable', async () => {
    // The whole point of resolving instead of throwing: a caller can tell a
    // missing user from a rate limit from a timeout and say something useful.
    const cases = [
      ['not_found', 'User not found'],
      ['rate_limited', 'Rate limited'],
      ['timeout', 'Request timed out'],
      ['unknown', 'Something went wrong'],
    ] as const

    for (const [errorType, error] of cases) {
      jest.clearAllMocks()
      mockedAxios.get.mockResolvedValue({ data: errorPayload(error, errorType) })
      const result = (await fetchUserData(`user-${errorType}`)) as {
        error?: string
        errorType?: string
      }
      expect(result.errorType).toBe(errorType)
      expect(result.error).toBe(error)
    }
  })

  it('propagates a genuine transport failure', async () => {
    // validateStatus only suppresses status-based rejection. A network failure
    // still rejects, and callers must handle that separately.
    mockedAxios.get.mockRejectedValue(new Error('Network Error'))
    await expect(fetchUserData('octocat')).rejects.toThrow('Network Error')
  })
})

describe('fetchUserData — in-flight deduplication', () => {
  /** A request that stays pending until the returned `resolve` is called. */
  const pendingRequest = () => {
    let resolve!: (value: { data: UserData }) => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<{ data: UserData }>((res, rej) => {
      resolve = res
      reject = rej
    })
    mockedAxios.get.mockReturnValue(promise as never)
    return { resolve, reject }
  }

  it('makes one request for two concurrent calls', async () => {
    const { resolve } = pendingRequest()
    const first = fetchUserData('octocat')
    const second = fetchUserData('octocat')
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    resolve({ data: userData('octocat') })
    await Promise.all([first, second])
  })

  it('gives both callers the same result', async () => {
    const { resolve } = pendingRequest()
    const first = fetchUserData('octocat')
    const second = fetchUserData('octocat')
    const payload = userData('octocat')
    resolve({ data: payload })
    const [a, b] = await Promise.all([first, second])
    expect(a).toBe(payload)
    expect(b).toBe(payload)
  })

  it('treats usernames case-insensitively', async () => {
    // The key is lowercased, so "Octocat" and "octocat" must share a request.
    // Missing this would silently double every request from a mixed-case link.
    const { resolve } = pendingRequest()
    const first = fetchUserData('Octocat')
    const second = fetchUserData('octocat')
    const third = fetchUserData('OCTOCAT')
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    resolve({ data: userData('octocat') })
    await Promise.all([first, second, third])
  })

  it('does not merge requests for different users', async () => {
    mockedAxios.get.mockResolvedValue({ data: userData('x') })
    await Promise.all([fetchUserData('alice'), fetchUserData('bob')])
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })

  it('releases the entry once the request succeeds', async () => {
    // Without the `.finally()` cleanup the Map would grow for the lifetime of
    // the page and every user would be served a stale promise forever.
    mockedAxios.get.mockResolvedValue({ data: userData('octocat') })
    await fetchUserData('octocat')
    await fetchUserData('octocat')
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })

  it('releases the entry when the request rejects', async () => {
    // The failure path matters more: a cached rejected promise would make the
    // user unfetchable for the rest of the session.
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchUserData('octocat')).rejects.toThrow('Network Error')

    mockedAxios.get.mockResolvedValueOnce({ data: userData('octocat') } as never)
    await expect(fetchUserData('octocat')).resolves.toBeDefined()
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })

  it('rejects both callers when a shared request fails', async () => {
    const { reject } = pendingRequest()
    const first = fetchUserData('octocat')
    const second = fetchUserData('octocat')
    reject(new Error('Network Error'))
    await expect(first).rejects.toThrow('Network Error')
    await expect(second).rejects.toThrow('Network Error')
  })

  it('allows a fresh request after a shared failure', async () => {
    const { reject } = pendingRequest()
    const first = fetchUserData('octocat')
    const second = fetchUserData('octocat')
    reject(new Error('Network Error'))
    await expect(first).rejects.toThrow()
    await expect(second).rejects.toThrow()

    mockedAxios.get.mockResolvedValue({ data: userData('octocat') } as never)
    await expect(fetchUserData('octocat')).resolves.toBeDefined()
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })
})
