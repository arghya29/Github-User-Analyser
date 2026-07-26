/**
 * Tests for the canonical base URL resolver.
 *
 * `lib/siteUrl.ts` reads `env.NEXT_PUBLIC_SITE_URL` at call time and prefers it
 * over anything derived from headers, so every test loads the module through
 * `loadSiteUrl()` with the env mocked to either a configured or unconfigured
 * state. Without that, the header-derivation branch — the one every deployment
 * without an explicit site URL actually runs — is unreachable.
 *
 * The result feeds Open Graph and export URLs, so a wrong value shows up as a
 * broken link rather than an error. That is what makes the fallback ordering
 * worth pinning down.
 */

import type { IncomingMessage } from 'http'

type SiteUrlModule = typeof import('@/lib/siteUrl')

async function loadSiteUrl(configuredSiteUrl?: string): Promise<SiteUrlModule> {
  jest.resetModules()
  jest.doMock('@/lib/env', () => ({
    env: { NEXT_PUBLIC_SITE_URL: configuredSiteUrl },
  }))
  return import('@/lib/siteUrl')
}

/** Minimal request stand-in: `resolveBaseUrl` only ever reads `headers`. */
const req = (headers: Record<string, string | string[] | undefined>) =>
  ({ headers }) as unknown as IncomingMessage

describe('resolveBaseUrl — configured site URL', () => {
  it('prefers NEXT_PUBLIC_SITE_URL over request headers', async () => {
    const { resolveBaseUrl } = await loadSiteUrl('https://configured.example')
    const result = resolveBaseUrl(
      req({ 'x-forwarded-host': 'proxy.example', host: 'origin.example' })
    )
    expect(result).toBe('https://configured.example')
  })

  it('trims a single trailing slash', async () => {
    const { resolveBaseUrl } = await loadSiteUrl('https://configured.example/')
    expect(resolveBaseUrl(req({}))).toBe('https://configured.example')
  })

  it('leaves a path segment intact', async () => {
    const { resolveBaseUrl } = await loadSiteUrl('https://configured.example/app')
    expect(resolveBaseUrl(req({}))).toBe('https://configured.example/app')
  })

  it('falls through to headers when the value is an empty string', async () => {
    // env.ts normalises empty vars to undefined, but an empty string must not
    // short-circuit to '' either way.
    const { resolveBaseUrl } = await loadSiteUrl('')
    expect(resolveBaseUrl(req({ host: 'origin.example' }))).toBe('https://origin.example')
  })
})

describe('resolveBaseUrl — derived from headers', () => {
  let resolveBaseUrl: SiteUrlModule['resolveBaseUrl']

  beforeEach(async () => {
    ;({ resolveBaseUrl } = await loadSiteUrl(undefined))
  })

  it('uses the forwarded proto and host behind a proxy', () => {
    const result = resolveBaseUrl(
      req({ 'x-forwarded-proto': 'https', 'x-forwarded-host': 'public.example' })
    )
    expect(result).toBe('https://public.example')
  })

  it('honours a forwarded proto of http', () => {
    const result = resolveBaseUrl(
      req({ 'x-forwarded-proto': 'http', 'x-forwarded-host': 'public.example' })
    )
    expect(result).toBe('http://public.example')
  })

  it('falls back to the host header when nothing is forwarded', () => {
    expect(resolveBaseUrl(req({ host: 'origin.example' }))).toBe('https://origin.example')
  })

  it('defaults the protocol to https when only a host is present', () => {
    // A deployment that terminates TLS upstream may forward no proto at all;
    // guessing http would produce mixed-content links.
    expect(resolveBaseUrl(req({ host: 'origin.example:3000' }))).toBe(
      'https://origin.example:3000'
    )
  })

  it('prefers the forwarded host over the host header', () => {
    const result = resolveBaseUrl(
      req({ 'x-forwarded-host': 'public.example', host: 'internal.local' })
    )
    expect(result).toBe('https://public.example')
  })

  it('takes the first value from a comma-separated forwarded host', () => {
    // A chain of proxies appends, so the leftmost entry is the original.
    const result = resolveBaseUrl(
      req({ 'x-forwarded-host': 'public.example, internal.local' })
    )
    expect(result).toBe('https://public.example')
  })

  it('takes the first value from a comma-separated forwarded proto', () => {
    const result = resolveBaseUrl(
      req({ 'x-forwarded-proto': 'https,http', 'x-forwarded-host': 'public.example' })
    )
    expect(result).toBe('https://public.example')
  })

  it('takes the first element when a header arrives as an array', () => {
    // Node exposes repeated headers as an array rather than a joined string.
    const result = resolveBaseUrl(
      req({
        'x-forwarded-proto': ['http', 'https'],
        'x-forwarded-host': ['first.example', 'second.example'],
      })
    )
    expect(result).toBe('http://first.example')
  })

  it('returns an empty string when no host is available at all', () => {
    // Callers treat '' as "use a root-relative path", so this must not become
    // the string "https://".
    expect(resolveBaseUrl(req({}))).toBe('')
  })

  it('returns an empty string when a proto is present but no host is', () => {
    expect(resolveBaseUrl(req({ 'x-forwarded-proto': 'https' }))).toBe('')
  })

  it('ignores an empty forwarded host and uses the host header', () => {
    expect(resolveBaseUrl(req({ 'x-forwarded-host': '', host: 'origin.example' }))).toBe(
      'https://origin.example'
    )
  })
})
