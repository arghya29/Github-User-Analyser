import { useState } from 'react'
import type { GitHubUser, Repository, ProductivityStats } from '@/types/github'

interface AiInsightPanelProps {
  user: GitHubUser
  repos: Repository[]
  totalContributions: number | null
  productivity: ProductivityStats | null
}

import { computeContributionTrend, computeLanguageProfile } from '@/lib/insightSignals'

type InsightType = 'bio' | 'roast' | 'consistency' | 'growth' | 'learning'
type ToneType = 'Professional' | 'Casual' | 'Tech-Heavy'
type LengthType = 'Short' | 'Detailed'

function buildTopRepos(repos: Repository[]) {
  return [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({ name: r.name, description: r.description, stars: r.stargazers_count }))
}

function buildTopLanguages(repos: Repository[]): string[] {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.language) continue
    counts.set(repo.language, (counts.get(repo.language) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)
}

export default function AiInsightPanel({ user, repos, totalContributions, productivity }: AiInsightPanelProps) {
  const [activeType, setActiveType] = useState<InsightType | null>(null)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // New states for UI Customization (Phase 2)
  const [bioTone, setBioTone] = useState<ToneType>('Professional')
  const [bioLength, setBioLength] = useState<LengthType>('Short')

  const generate = async (type: InsightType) => {
    setActiveType(type)
    setLoading(true)
    setError('')
    setText(null)
    setCopied(false)

    const total = productivity ? productivity.weekdayCount + productivity.weekendCount : 0
    const weekdayPct = productivity && total > 0 ? Math.round((productivity.weekdayCount / total) * 100) : undefined
    const weekendPct = weekdayPct !== undefined ? 100 - weekdayPct : undefined
    const mostProductiveDay = productivity?.mostProductiveDay
      ? `${productivity.mostProductiveDay.date} (${productivity.mostProductiveDay.count} contributions)`
      : undefined
    // Growth/learning signals, derived from data the panel already receives —
    // productivity.monthlyTotals and the repo list — so neither mode costs an
    // extra GitHub request.
    const trend = computeContributionTrend(productivity?.monthlyTotals)
    const languageProfile = computeLanguageProfile(repos)

    // Tone and length apply to every analytical insight, not the roast.
    const usesToneLength = type !== 'roast'

    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          username: user.login,
          bio: user.bio,
          topLanguages: buildTopLanguages(repos),
          topRepos: buildTopRepos(repos),
          totalContributions: totalContributions ?? undefined,
          currentStreak: productivity?.currentStreak,
          longestStreak: productivity?.longestStreak,
          weekdayPct,
          weekendPct,
          mostProductiveDay,
          contributionTrend: trend?.direction,
          contributionChangePct: trend?.changePct ?? undefined,
          recentAvgPerMonth: trend?.recentAvgPerMonth,
          previousAvgPerMonth: trend?.previousAvgPerMonth,
          languageCount: languageProfile.languageCount,
          primaryLanguageSharePct: languageProfile.primaryLanguageSharePct ?? undefined,
          secondaryLanguages: languageProfile.secondaryLanguages,
          recentLanguages: languageProfile.recentLanguages,
          // Tone and length apply to every analytical insight
          tone: usesToneLength ? bioTone : undefined,
          length: usesToneLength ? bioLength : undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      const text = typeof data?.text === 'string' ? data.text.trim() : ''
      if (!response.ok || !data) {
        setError(data?.error || 'Failed to generate AI insight — please try again')
      } else if (data.error) {
        setError(data.error)
      } else if (!text) {
        setError('Failed to generate AI insight — please try again')
      } else {
        setText(text)
      }
    } catch {
      setError('Failed to generate AI insight — please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!text) return
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">AI Insights</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Generated by AI from this profile&apos;s public data — for fun, double-check before using anywhere serious.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          Tone:
          <select
            value={bioTone}
            onChange={(e) => setBioTone(e.target.value as ToneType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="Professional">Professional</option>
            <option value="Casual">Casual</option>
            <option value="Tech-Heavy">Tech-Heavy</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          Length:
          <select
            value={bioLength}
            onChange={(e) => setBioLength(e.target.value as LengthType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="Short">Short Summary</option>
            <option value="Detailed">Detailed</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => generate('bio')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === 'bio' ? 'Writing...' : 'Generate Bio'}
        </button>
        <button
          onClick={() => generate('roast')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === 'roast' ? 'Cooking...' : 'Roast or Toast'}
        </button>
        <button
          onClick={() => generate('consistency')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === 'consistency' ? 'Analyzing...' : 'Consistency'}
        </button>
        <button
          onClick={() => generate('growth')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === 'growth' ? 'Assessing...' : 'Growth'}
        </button>
        <button
          onClick={() => generate('learning')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === 'learning' ? 'Reviewing...' : 'Learning'}
        </button>
      </div>

      {error && <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>}

      {text && (
        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
          {activeType !== null && activeType !== 'roast' && (
            <button
              onClick={handleCopy}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
