import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import { getClientIp, createRateLimiter } from '@/lib/rateLimit'
import { sanitizeUsername } from '@/lib/securitySanitizer'
import { env } from '@/lib/env'
import { logError, logWarn } from '@/lib/errorLogger'

// Extend the serverless function timeout to 60 seconds to allow for retries
export const maxDuration = 60

interface AiInsightRequestBody {
  type: 'bio' | 'roast' | 'consistency' | 'growth' | 'learning'
  username: string
  bio?: string
  topLanguages: string[]
  topRepos: { name: string; description: string; stars: number }[]
  totalContributions?: number
  currentStreak?: number
  longestStreak?: number
  weekdayPct?: number
  weekendPct?: number
  mostProductiveDay?: string
  // Growth signals (derived client-side from productivity.monthlyTotals).
  contributionTrend?: 'accelerating' | 'steady' | 'cooling'
  contributionChangePct?: number
  recentAvgPerMonth?: number
  previousAvgPerMonth?: number
  // Learning signals (derived client-side from the repo list).
  languageCount?: number
  primaryLanguageSharePct?: number
  secondaryLanguages?: string[]
  recentLanguages?: string[]
  // Optional parameters to support Phase 2 UI customization
  tone?: 'Professional' | 'Casual' | 'Tech-Heavy'
  length?: 'Short' | 'Detailed'
}

interface AiInsightResponse {
  text: string | null
  error?: string
}

function isAiInsightRequestBody(body: unknown): body is AiInsightRequestBody {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false
  }

  const data = body as Record<string, unknown>
  if (typeof data.type !== 'string') {
    return false
  }
  if (
    data.type !== 'bio' &&
    data.type !== 'roast' &&
    data.type !== 'consistency' &&
    data.type !== 'growth' &&
    data.type !== 'learning'
  ) {
    return false
  }
  if (typeof data.username !== 'string') {
    return false
  }
  if (data.bio !== undefined && typeof data.bio !== 'string') {
    return false
  }
  if (!Array.isArray(data.topLanguages) || !data.topLanguages.every((item) => typeof item === 'string')) {
    return false
  }
  if (
    !Array.isArray(data.topRepos) ||
    !data.topRepos.every(
      (repo) =>
        repo &&
        typeof repo === 'object' &&
        typeof (repo as Record<string, unknown>).name === 'string' &&
        typeof (repo as Record<string, unknown>).description === 'string' &&
        typeof (repo as Record<string, unknown>).stars === 'number'
    )
  ) {
    return false
  }
  if (data.totalContributions !== undefined && typeof data.totalContributions !== 'number') {
    return false
  }
  if (data.currentStreak !== undefined && typeof data.currentStreak !== 'number') {
    return false
  }
  if (data.longestStreak !== undefined && typeof data.longestStreak !== 'number') {
    return false
  }
  if (data.weekdayPct !== undefined && typeof data.weekdayPct !== 'number') {
    return false
  }
  if (data.weekendPct !== undefined && typeof data.weekendPct !== 'number') {
    return false
  }
  if (data.mostProductiveDay !== undefined && typeof data.mostProductiveDay !== 'string') {
    return false
  }
  if (
    data.contributionTrend !== undefined &&
    (typeof data.contributionTrend !== 'string' ||
      (data.contributionTrend !== 'accelerating' &&
        data.contributionTrend !== 'steady' &&
        data.contributionTrend !== 'cooling'))
  ) {
    return false
  }
  for (const key of [
    'contributionChangePct',
    'recentAvgPerMonth',
    'previousAvgPerMonth',
    'languageCount',
    'primaryLanguageSharePct',
  ] as const) {
    if (data[key] !== undefined && typeof data[key] !== 'number') {
      return false
    }
  }
  for (const key of ['secondaryLanguages', 'recentLanguages'] as const) {
    if (
      data[key] !== undefined &&
      (!Array.isArray(data[key]) ||
        !(data[key] as unknown[]).every((item) => typeof item === 'string'))
    ) {
      return false
    }
  }
  if (
    data.tone !== undefined &&
    (typeof data.tone !== 'string' ||
      (data.tone !== 'Professional' && data.tone !== 'Casual' && data.tone !== 'Tech-Heavy'))
