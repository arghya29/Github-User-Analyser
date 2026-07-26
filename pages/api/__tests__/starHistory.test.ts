import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import handler from '@/pages/api/star-history'

/**
 * Tests for the paginated star-history route.
 *
 * The route previously issued one request with `per_page: 100` and returned the
 * resulting timeline as though it were complete. GitHub serves stargazers
 * oldest-first, so for any repository above 100 stars the chart climbed to
 * exactly 100 and stopped — at whatever date the 100th star landed, often years
 * ago — with no error and no indication the series was partial.
 *
 * What these tests pin down:
 *
 *  - pagination follows `rel="next"` and accumulates pages
 *  - it stops at the page cap and reports `truncated: true`, so the UI can say
 *    the series is a sample rather than misrepresenting the trend
 *  - a repository that fits in one page is unchanged and reports
 *    `truncated: false`
 *  - the error paths behave exactly as before, including part-way through
 *    pagination
 */

jest.mock('axios')
jest.mock('@/lib/errorLogger', () => ({ logError: jest.fn(), logWarn: jest.fn() }))

const mockedAxios = axios as jest.Mocked<typeof axios>

/** A stargazer record `n` days after the epoch date. */
const star = (dayOffset: number) => ({
  starred_at: new Date(Date.UTC(2020, 0, 1 + dayOffset)).toISOString(),
})

/** One page of `count` stargazers, optionally advertising a next page. */
const page = (count: number, hasNext: boolean, startDay = 0) => ({
  status: 200,
  data: Array.from({ length: count }, (_, i) => star(startDay + i)),
  headers: hasNext
    ? { link: '<https://api.github.com/repositories/1/stargazers?page=2>; rel="next"' }
    : {},
})

const run = async (query: Record<string, string> = { owner: 'facebook', repo: 'react' }) => {
  const json = jest.fn()
  // The code is captured in the implementation rather than read back off
  // `mock.calls`: an inferred zero-argument mock types `calls[0]` as an empty
  // tuple, so indexing it does not compile.
  let statusCode: number | undefined
  const status = jest.fn((code: number) => {
    statusCode = code
    return { json }
  })
  const res = { status } as unknown as NextApiResponse
  await handler({ query } as unknown as NextApiRequest, res)
  return {
    status: statusCode,
    body: json.mock.calls[0]?.[0],
    requestCount: mockedAxios.get.mock.calls.length,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('validation', () => {
  it.each([
    ['no owner', { repo: 'react' }],
    ['no repo', { owner: 'facebook' }],
    ['neither', {}],
  ])('rejects a request with %s', async (_label, query) => {
    const { status, body } = await run(query as Record<string, string>)
    expect(status).toBe(400)
    expect(body).toMatchObject({ errorType: 'unknown' })
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })
})

describe('a repository that fits in one page', () => {
  it('makes a single request and reports no truncation', async () => {
    mockedAxios.get.mockResolvedValueOnce(page(40, false))
    const { status, body, requestCount } = await run()
    expect(status).toBe(200)
    expect(requestCount).toBe(1)
    expect(body).toMatchObject({ truncated: false, sampleSize: 40 })
  })

  it('builds a cumulative timeline ending at the true total', async () => {
    mockedAxios.get.mockResolvedValueOnce(page(40, false))
    const { body } = await run()
    const timeline = body.timeline as { date: string; count: number }[]
    expect(timeline[timeline.length - 1].count).toBe(40)
  })

  it('bounds every page request with a timeout', async () => {
    // With up to ten sequential calls, one hung page would otherwise occupy the
    // handler indefinitely.
    mockedAxios.get.mockResolvedValueOnce(page(1, false))
    await run()
    expect(mockedAxios.get.mock.calls[0][1]?.timeout).toBe(10_000)
  })

  it('accepts every status so errors are branched on, not thrown', async () => {
    // The route inspects response.status itself; without this axios would
    // reject on 404 and the tailored error bodies would never be reached.
    mockedAxios.get.mockResolvedValueOnce(page(1, false))
    await run()
    const validateStatus = mockedAxios.get.mock.calls[0][1]?.validateStatus
    expect(typeof validateStatus).toBe('function')
    for (const status of [200, 403, 404, 500]) {
      expect(validateStatus?.(status)).toBe(true)
    }
  })

  it('returns an empty result for a repository with no stars', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: [], headers: {} })
    const { status, body } = await run()
    expect(status).toBe(200)
    expect(body).toEqual({ timeline: [], truncated: false, sampleSize: 0 })
  })

  it('stops when there is no next link even on a full page', async () => {
    // Exactly 100 stars with no `rel="next"` means that is genuinely all of
    // them — the old code could not tell this apart from a truncated first page.
    mockedAxios.get.mockResolvedValueOnce(page(100, false))
    const { body, requestCount } = await run()
    expect(requestCount).toBe(1)
    expect(body).toMatchObject({ truncated: false, sampleSize: 100 })
  })
})

describe('a repository spanning several pages', () => {
  it('follows rel="next" and accumulates every page', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(page(100, true, 0))
      .mockResolvedValueOnce(page(100, true, 100))
      .mockResolvedValueOnce(page(45, false, 200))

    const { body, requestCount } = await run()
    expect(requestCount).toBe(3)
    expect(body.sampleSize).toBe(245)
    expect(body.truncated).toBe(false)
  })

  it('produces a timeline that climbs past 100', async () => {
    // The heart of the bug: the old route's series stopped at exactly 100.
    mockedAxios.get
      .mockResolvedValueOnce(page(100, true, 0))
      .mockResolvedValueOnce(page(100, false, 100))

    const { body } = await run()
    const timeline = body.timeline as { date: string; count: number }[]
    expect(timeline[timeline.length - 1].count).toBe(200)
  })

  it('requests successive page numbers', async () => {
    mockedAxios.get
      .mockResolvedValueOnce(page(100, true, 0))
      .mockResolvedValueOnce(page(10, false, 100))

    await run()
    expect(mockedAxios.get.mock.calls[0][1]?.params).toMatchObject({ per_page: 100, page: 1 })
    expect(mockedAxios.get.mock.calls[1][1]?.params).toMatchObject({ per_page: 100, page: 2 })
  })
})

describe('a repository beyond the page cap', () => {
  it('stops at ten pages and reports truncation', async () => {
    // Every page advertises another, so only the cap ends the loop.
    mockedAxios.get.mockResolvedValue(page(100, true))
    const { body, requestCount } = await run()
    expect(requestCount).toBe(10)
    expect(body.truncated).toBe(true)
    expect(body.sampleSize).toBe(1000)
  })

  it('never issues an unbounded number of requests', async () => {
    // The cap is what keeps a repository with 80,000 stars from costing 800
    // calls against a shared rate limit.
    mockedAxios.get.mockResolvedValue(page(100, true))
    const { requestCount } = await run()
    expect(requestCount).toBeLessThanOrEqual(10)
  })

  it('is not marked truncated when the last page has no next link', async () => {
    // Exactly at the cap but genuinely complete — reporting truncation here
    // would put a false qualifier on an accurate chart.
    const calls = Array.from({ length: 9 }, () => page(100, true))
    mockedAxios.get.mockResolvedValueOnce(calls[0])
    for (let i = 1; i < 9; i++) mockedAxios.get.mockResolvedValueOnce(calls[i])
    mockedAxios.get.mockResolvedValueOnce(page(100, false))

    const { body, requestCount } = await run()
    expect(requestCount).toBe(10)
    expect(body.truncated).toBe(false)
  })
})

describe('error paths behave as before', () => {
  it('surfaces a missing repository', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 404, data: {}, headers: {} })
    const { status, body } = await run()
    expect(status).toBe(404)
    expect(body).toMatchObject({ errorType: 'not_found' })
  })

  it('surfaces a rate limit', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 403, data: {}, headers: {} })
    const { status, body } = await run()
    expect(status).toBe(403)
    expect(body).toMatchObject({ errorType: 'rate_limited' })
  })

  it('surfaces a secondary rate limit as 429, not a server error', async () => {
    // GitHub uses 403 for the primary rate limit and 429 for the secondary.
    // Letting 429 fall through to the generic branch would report rate
    // limiting as a 500, and the client could not tell the two apart.
    mockedAxios.get.mockResolvedValueOnce({ status: 429, data: {}, headers: {} })
    const { status, body } = await run()
    expect(status).toBe(429)
    expect(body).toMatchObject({ errorType: 'rate_limited' })
  })

  it('propagates the original rate-limit status rather than normalising it', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 403, data: {}, headers: {} })
    expect((await run()).status).toBe(403)
    jest.clearAllMocks()
    mockedAxios.get.mockResolvedValueOnce({ status: 429, data: {}, headers: {} })
    expect((await run()).status).toBe(429)
  })

  it('surfaces an unexpected status', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 500, data: {}, headers: {} })
    const { status, body } = await run()
    expect(status).toBe(500)
    expect(body).toMatchObject({ errorType: 'unknown' })
  })

  it('fails rather than returning a partial history when a later page errors', async () => {
    // Returning what was gathered so far would reintroduce exactly the silent
    // truncation this change exists to remove.
    mockedAxios.get
      .mockResolvedValueOnce(page(100, true, 0))
      .mockResolvedValueOnce({ status: 403, data: {}, headers: {} })

    const { status, body } = await run()
    expect(status).toBe(403)
    expect(body).toMatchObject({ errorType: 'rate_limited' })
  })

  it('handles a thrown transport error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))
    const { status, body } = await run()
    expect(status).toBe(500)
    expect(body).toMatchObject({ errorType: 'unknown' })
  })

  it('tolerates a non-array page body without throwing', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: null, headers: {} })
    const { status, body } = await run()
    expect(status).toBe(200)
    expect(body).toMatchObject({ sampleSize: 0 })
  })
})

describe('aggregation', () => {
  it('groups stars landing on the same day', async () => {
    const sameDay = { starred_at: '2024-03-01T10:00:00Z' }
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: [sameDay, sameDay, sameDay],
      headers: {},
    })
    const { body } = await run()
    expect(body.timeline).toEqual([{ date: '2024-03-01', count: 3 }])
  })

  it('orders the timeline by date regardless of arrival order', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: [
        { starred_at: '2024-03-05T00:00:00Z' },
        { starred_at: '2024-01-01T00:00:00Z' },
        { starred_at: '2024-02-02T00:00:00Z' },
      ],
      headers: {},
    })
    const { body } = await run()
    expect((body.timeline as { date: string }[]).map((e) => e.date)).toEqual([
      '2024-01-01',
      '2024-02-02',
      '2024-03-05',
    ])
  })
})
