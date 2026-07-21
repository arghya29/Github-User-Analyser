import type { NextApiResponse } from 'next'
import { exportUserDataSchema, validateRequest } from '@/lib/apiValidation'

describe('exportUserDataSchema', () => {
  it('accepts a valid user + repos, allowing extra fields', () => {
    const result = exportUserDataSchema.safeParse({
      user: { login: 'octocat', avatar_url: 'x' },
      repos: [{ name: 'r' }],
      productivity: { currentStreak: 3 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-string login', () => {
    expect(
      exportUserDataSchema.safeParse({ user: { login: 5 }, repos: [] }).success
    ).toBe(false)
  })

  it('rejects non-array repos', () => {
    expect(
      exportUserDataSchema.safeParse({ user: { login: 'x' }, repos: 'nope' })
        .success
    ).toBe(false)
  })

  it('rejects a null or empty body', () => {
    expect(exportUserDataSchema.safeParse(null).success).toBe(false)
    expect(exportUserDataSchema.safeParse({}).success).toBe(false)
  })
})

function createMockRes() {
  const state: { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: undefined,
  }
  const res = {
    status(code: number) {
      state.statusCode = code
      return res
    },
    json(body: unknown) {
      state.body = body
      return res
    },
  }
  return { res: res as unknown as NextApiResponse, state }
}

describe('validateRequest', () => {
  it('returns parsed data and leaves the response untouched on success', () => {
    const { res, state } = createMockRes()
    const data = validateRequest(res, exportUserDataSchema, {
      user: { login: 'x' },
      repos: [],
    })
    expect(data).not.toBeNull()
    expect(state.statusCode).toBe(200)
  })

  it('returns null and sends a standard 400 shape on failure', () => {
    const { res, state } = createMockRes()
    const data = validateRequest(res, exportUserDataSchema, {
      user: {},
      repos: [],
    })
    expect(data).toBeNull()
    expect(state.statusCode).toBe(400)
    const body = state.body as { error: string; details: unknown[] }
    expect(body.error).toBe('Invalid request body')
    expect(Array.isArray(body.details)).toBe(true)
  })
})
