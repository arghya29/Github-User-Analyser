import type { ContributionDay } from '@/types/github'

interface OfflineContribution {
  username: string
  contributionDay: ContributionDay
  syncedAt: string | null
}

const PENDING_KEY = 'gh-analyzer-pending'

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

export function queueOfflineContribution(
  username: string,
  day: ContributionDay
): void {
  try {
    const storage = getStorage()
    const raw = storage?.getItem(PENDING_KEY)
    const queue: OfflineContribution[] = raw ? JSON.parse(raw) : []
    queue.push({ username, contributionDay: day, syncedAt: null })
    storage?.setItem(PENDING_KEY, JSON.stringify(queue))
  } catch {
    // storage unavailable
  }
}

export function getPendingContributions(): OfflineContribution[] {
  try {
    const raw = getStorage()?.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearSyncedContributions(): void {
  try {
    getStorage()?.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
}
