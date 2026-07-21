import {
  sanitizeUsername,
  sanitizeRepoName,
  validateUsername,
} from '@/lib/validation'

describe('validateUsername', () => {
  it('accepts a valid handle', () => {
    expect(validateUsername('octocat')).toEqual({ valid: true })
    expect(validateUsername('octo-cat')).toEqual({ valid: true })
    expect(validateUsername('a1-b2-c3')).toEqual({ valid: true })
  })

  it('rejects an empty or whitespace-only username', () => {
    expect(validateUsername('')).toEqual({
      valid: false,
      reason: 'Username is required',
    })
    expect(validateUsername('   ')).toEqual({
      valid: false,
      reason: 'Username is required',
    })
  })

  it('rejects a username longer than 39 characters', () => {
    const result = validateUsername('a'.repeat(40))
    expect(result.valid).toBe(false)
    expect(result.reason).toBe(
      'Username exceeds maximum length (39 characters)'
    )
  })

  it('rejects leading, trailing, and consecutive hyphens', () => {
    for (const bad of ['-octocat', 'octocat-', 'octo--cat']) {
      const result = validateUsername(bad)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Username contains invalid characters')
    }
  })

  it('rejects disallowed characters (underscore, space, symbols)', () => {
    for (const bad of ['octo_cat', 'octo cat', 'octo@cat', 'octo.cat']) {
      expect(validateUsername(bad).valid).toBe(false)
    }
  })
})

describe('sanitizeUsername', () => {
  it('returns a clean handle unchanged', () => {
    expect(sanitizeUsername('octo-cat')).toBe('octo-cat')
  })

  it('strips characters that are not alphanumeric or hyphen', () => {
    expect(sanitizeUsername('octo@cat!')).toBe('octocat')
    expect(sanitizeUsername('octo cat')).toBe('octocat')
    expect(sanitizeUsername('octo_cat')).toBe('octocat')
  })

  it('truncates to 39 characters', () => {
    expect(sanitizeUsername('a'.repeat(50))).toHaveLength(39)
  })
})

describe('sanitizeRepoName', () => {
  it('keeps allowed characters (alphanumeric, hyphen, underscore, dot)', () => {
    expect(sanitizeRepoName('my-repo_name.js')).toBe('my-repo_name.js')
  })

  it('strips disallowed characters', () => {
    expect(sanitizeRepoName('my repo!*')).toBe('myrepo')
  })

  it('truncates to 100 characters', () => {
    expect(sanitizeRepoName('a'.repeat(150))).toHaveLength(100)
  })
})
