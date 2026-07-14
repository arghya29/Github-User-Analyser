import type { NextApiRequest } from 'next'
import { getClientIp, createRateLimiter } from '@/lib/rateLimit'

function mockReq(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress = '10.0.0.1'
): NextApiRequest {
  return { headers, socket: { remoteAddress } } as unknown as NextApiRequest
}

describe('getClientIp trust boundary', () => {
  it('prefers x-real-ip (platform-set, unspoofable) over x-forwarded-for', () => {
    const req = mockReq({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '1.2.3.4, 203.0.113.9',
    })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('uses the rightmost (platform-appended) x-forwarded-for hop, not the client-controlled leftmost', () => {
    const req = mockReq({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })
    expect(getClientIp(req)).toBe('203.0.113.9')
  })

  it('a rotating/forged leftmost x-forwarded-for does not change the derived IP', () => {
    const a = mockReq({ 'x-forwarded-for': 'evil-1, 203.0.113.9' })
    const b = mockReq({ 'x-forwarded-for': 'evil-2, 203.0.113.9' })
    expect(getClientIp(a)).toBe(getClientIp(b))
  })

  it('falls back to socket.remoteAddress when no forwarding headers are present', () => {
    const req = mockReq({}, '198.51.100.7')
    expect(getClientIp(req)).toBe('198.51.100.7')
  })
})

describe('rate limiter cannot be bypassed by spoofing the leftmost XFF entry', () => {
  it('the same real (appended) IP hits the limit despite a rotating forged leftmost hop', () => {
    const limiter = createRateLimiter(60_000, 2)
    const ipFor = (forged: string) =>
      getClientIp(mockReq({ 'x-forwarded-for': `${forged}, 203.0.113.9` }))
    expect(limiter.check(ipFor('a'))).resolves.toBeNull() // request 1 — allowed
    expect(limiter.check(ipFor('b'))).resolves.toBeNull() // request 2 — allowed
    expect(limiter.check(ipFor('c'))).resolves.not.toBeNull() // request 3 — blocked (same real IP)
  })
})
