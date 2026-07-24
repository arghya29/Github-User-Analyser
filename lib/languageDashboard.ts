import type { Repository } from '@/types/github'
import { getLanguageColor } from '@/lib/languageColors'

export interface LanguageRepoEntry {
  repoName: string
  languages: { name: string; bytes: number; percentage: number; color: string }[]
}

export interface LanguageDashboardStats {
  primaryLanguage: string | null
  languageCount: number
  mostVersatileRepo: { name: string; langCount: number } | null
  languageRepoTotals: { name: string; count: number; color: string }[]
}

export function computeLanguageDashboardStats(repos: Repository[]): LanguageDashboardStats {
  const langSet = new Set<string>()
  const langRepoCount = new Map<string, number>()
  let maxLangCount = 0
  let mostVersatileRepo: { name: string; langCount: number } | null = null

  for (const repo of repos) {
    if (repo.language) {
      langSet.add(repo.language)
      langRepoCount.set(repo.language, (langRepoCount.get(repo.language) || 0) + 1)
    }
    if (repo.languages && repo.languages.length > maxLangCount) {
      maxLangCount = repo.languages.length
      mostVersatileRepo = { name: repo.name, langCount: repo.languages.length }
    }
  }

  const languageRepoTotals = Array.from(langRepoCount.entries())
    .map(([name, count]) => ({ name, count, color: getLanguageColor(name) }))
    .sort((a, b) => b.count - a.count)

  return {
    primaryLanguage: languageRepoTotals[0]?.name || null,
    languageCount: langSet.size,
    mostVersatileRepo,
    languageRepoTotals,
  }
}

export function getRepoLanguageBreakdown(repo: Repository): LanguageRepoEntry['languages'] {
  if (!repo.languages || repo.languages.length === 0) {
    if (repo.language) {
      return [
        { name: repo.language, bytes: 0, percentage: 100, color: getLanguageColor(repo.language) },
      ]
    }
    return []
  }

  const total = repo.languages.reduce((sum, l) => sum + l.bytes, 0)
  if (total === 0) return []

  return repo.languages
    .map((l) => ({
      name: l.name,
      bytes: l.bytes,
      percentage: Math.round((l.bytes / total) * 1000) / 10,
      color: getLanguageColor(l.name),
    }))
    .sort((a, b) => b.bytes - a.bytes)
}
