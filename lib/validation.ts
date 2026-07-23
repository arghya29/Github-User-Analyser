/**
 * Sanitizes a GitHub username by removing all non-alphanumeric characters
 * except hyphens (per GitHub's username validation rules).
 */
export function sanitizeUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 39);
}

export function sanitizeRepoName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9-_.]/g, "").slice(0, 100);
}

export function validateUsername(username: string): {
  valid: boolean;
  reason?: string;
} {
  if (!username || username.trim().length === 0) {
    return { valid: false, reason: "Username is required" };
  }
  if (username.length > 39) {
    return {
      valid: false,
      reason: "Username exceeds maximum length (39 characters)",
    };
  }
  if (!/^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/.test(username)) {
    return { valid: false, reason: "Username contains invalid characters" };
  }
  return { valid: true };
}
