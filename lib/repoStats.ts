import type { Repository } from '@/types/github'

export interface LanguageDistributionEntry {
  name: string
  value: number
}

export function aggregateLanguagesByBytes(repos: Repository[]): LanguageDistributionEntry[] {
  const totals = new Map<string, number>()
  let grandTotal = 0

  for (const repo of repos) {
    if (!repo.languages || repo.languages.length === 0) continue
    for (const lang of repo.languages) {
      totals.set(lang.name, (totals.get(lang.name) || 0) + lang.bytes)
      grandTotal += lang.bytes
    }
  }

  if (grandTotal === 0) return []

  return Array.from(totals.entries())
    .map(([name, bytes]) => ({ name, value: Math.round((bytes / grandTotal) * 1000) / 10 }))
    .sort((a, b) => b.value - a.value)
}

export function aggregateLanguagesByCount(repos: Repository[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.language) continue
    counts.set(repo.language, (counts.get(repo.language) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function hasByteLanguageData(repos: Repository[]): boolean {
  return repos.some((repo) => repo.languages && repo.languages.length > 0)
}