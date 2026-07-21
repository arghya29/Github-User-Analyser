export function getShareUrl(username: string): string {
  if (typeof window === 'undefined')
    return `https://github-user-analyser.vercel.app/${username}`
  return `${window.location.origin}/${username}`
}

export function getShareText(username: string, name?: string): string {
  const displayName = name || username
  return `Check out ${displayName}'s GitHub profile analysis on GitHub User Analyser!`
}

export function shareViaTwitter(username: string, name?: string): void {
  const url = getShareUrl(username)
  const text = getShareText(username, name)
  if (typeof window === 'undefined' || typeof window.open !== 'function') return

  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  )
}

export function shareViaLinkedIn(username: string): void {
  const url = getShareUrl(username)
  if (typeof window === 'undefined' || typeof window.open !== 'function') return

  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  )
}

export function shareViaWhatsApp(username: string, name?: string): void {
  const url = getShareUrl(username)
  const text = getShareText(username, name)
  if (typeof window === 'undefined' || typeof window.open !== 'function') return

  window.open(
    `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
    '_blank',
    'noopener,noreferrer'
  )
}

export async function copyProfileLink(username: string): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.clipboard?.writeText !== 'function'
    ) {
      return false
    }
    await navigator.clipboard.writeText(getShareUrl(username))
    return true
  } catch {
    return false
  }
}

export async function shareNative(
  username: string,
  name?: string
): Promise<void> {
  const url = getShareUrl(username)
  const text = getShareText(username, name)
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function')
    return
  await navigator.share({
    title: `GitHub Profile: ${name || username}`,
    text,
    url,
  })
}
