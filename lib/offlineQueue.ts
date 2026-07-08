import type { ContributionDay } from '@/types/github'

interface OfflineContribution {
  username: string
  contributionDay: ContributionDay
  syncedAt: string | null
}

const PENDING_KEY = 'gh-analyzer-pending'

export function queueOfflineContribution(username: string, day: ContributionDay): void {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const queue: OfflineContribution[] = raw ? JSON.parse(raw) : []
    queue.push({ username, contributionDay: day, syncedAt: null })
    localStorage.setItem(PENDING_KEY, JSON.stringify(queue))
  } catch {
    // storage unavailable
  }
}

export function getPendingContributions(): OfflineContribution[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearSyncedContributions(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
}
