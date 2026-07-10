import { z } from 'zod'

/**
 * Centralized, validated access to environment variables.
 *
 * Every value is optional because the app degrades gracefully when an
 * integration isn't configured: no GITHUB_TOKEN → lower (unauthenticated) rate
 * limits; no GEMINI_API_KEY → AI insights return a clear 503; no Upstash → the
 * in-memory cache is used; no NEXT_PUBLIC_SITE_URL → base URL is derived from
 * request headers. What this module adds over scattered `process.env` reads is a
 * single typed source of truth plus *format* validation — a set-but-malformed
 * URL is caught here with a clear message at startup instead of failing
 * mysteriously deep inside a request handler.
 *
 * Empty strings are normalized to `undefined` (an unset var and an empty var are
 * treated the same, matching the previous `if (process.env.X)` truthiness).
 */
const envSchema = z.object({
  GITHUB_TOKEN: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  })

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration — ${issues}`)
  }

  return parsed.data
}

export const env = loadEnv()
