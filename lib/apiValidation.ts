import type { NextApiResponse } from 'next'
import { z } from 'zod'

/**
 * Sends the standard 400 response for a request that fails schema validation.
 * Every route that validates input uses this shape so clients get a consistent
 * error contract: `{ error, details: [{ path, message }] }`.
 */
export function respondInvalid(res: NextApiResponse, error: z.ZodError): void {
  res.status(400).json({
    error: 'Invalid request body',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

/**
 * Validates `data` against `schema`. On success returns the parsed value; on
 * failure sends the standard 400 response and returns `null`, so a caller can
 * simply write `if (result === null) return`.
 */
export function validateRequest<T>(
  res: NextApiResponse,
  schema: z.ZodType<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    respondInvalid(res, result.error)
    return null
  }
  return result.data
}

/**
 * Shape shared by the CSV and PDF export routes: a user (identified by its
 * login) and a list of repositories. Additional fields (contributions,
 * engagement, productivity, etc.) are permitted — the routes read them
 * opportunistically — so only the essentials are required here.
 */
export const exportUserDataSchema = z.object({
  user: z.object({ login: z.string() }),
  repos: z.array(z.unknown()),
})
