import { useState } from 'react'
import type { Repository } from '@/types/github'
import { computeHealthScore } from '@/lib/healthScore'

interface HealthScoreBadgeProps {
  repo: Repository
}

const LABEL_COLORS: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Fair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Needs attention': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

export default function HealthScoreBadge({ repo }: HealthScoreBadgeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { score, label, breakdown } = computeHealthScore(repo)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowBreakdown((s) => !s)
        }}
        onMouseEnter={() => setShowBreakdown(true)}
        onMouseLeave={() => setShowBreakdown(false)}
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${LABEL_COLORS[label]}`}
      >
        {label} · {score}
      </button>

      {showBreakdown && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-10 bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 text-xs text-gray-600 dark:text-gray-300"
        >
          <p className="font-semibold text-gray-900 dark:text-white mb-2">Health score breakdown</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Recency</span>
              <span>{breakdown.recency}/40</span>
            </div>
            <div className="flex justify-between">
              <span>Issue resolution</span>
              <span>{breakdown.issueHealth}/30</span>
            </div>
            <div className="flex justify-between">
              <span>License</span>
              <span>{breakdown.license}/15</span>
            </div>
            <div className="flex justify-between">
              <span>Description</span>
              <span>{breakdown.documentation}/15</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}