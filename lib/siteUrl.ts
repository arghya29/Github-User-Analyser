import type { IncomingMessage } from 'http'

/**
 * Resolves the canonical base URL used to build absolute OG/Twitter URLs.
 *
 * Prefers NEXT_PUBLIC_SITE_URL (trailing slash trimmed) so every page agrees
 * across environments; otherwise derives it from forwarded/request headers,
 * which keeps the host correct behind a reverse proxy. Returns '' when nothing
 * is available so callers can fall back to a root-relative path.
 */
export function resolveBaseUrl(req: IncomingMessage): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''
  if (configuredSiteUrl) return configuredSiteUrl

  const forwardedProto = req.headers['x-forwarded-proto']
  const forwardedHost = req.headers['x-forwarded-host']
  const proto =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0] || 'https'
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)?.split(',')[0] ||
    req.headers.host ||
    ''

  return host ? `${proto}://${host}` : ''
}
