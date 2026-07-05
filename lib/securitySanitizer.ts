/**
 * Security utility for input sanitization and parameter sanitization.
 */

// GitHub usernames can contain only alphanumeric characters and single hyphens.
// Length is between 1 and 39 characters.
const USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/

// Repo names can contain only alphanumeric, hyphens, periods, or underscores.
// Length is up to 100 characters.
const REPO_REGEX = /^[a-zA-Z0-9._-]{1,100}$/

export function sanitizeUsername(username: string): string {
  const trimmed = username.trim()
  if (!USERNAME_REGEX.test(trimmed)) {
    throw new Error('Invalid username parameter format.')
  }
  return trimmed
}

export function sanitizeRepoName(repoName: string): string {
  const trimmed = repoName.trim()
  if (!REPO_REGEX.test(trimmed)) {
    throw new Error('Invalid repository parameter format.')
  }
  return trimmed
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
