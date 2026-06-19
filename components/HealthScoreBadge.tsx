import { useState } from 'react'
import type { Repository } from '@/types/github'
import { computeHealthScore } from '@/lib/healthScore'

interface HealthScoreBadgeProps {
  repo: Repository
}

const TEXT_COLORS: Record<string, string> = {
  Excellent: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50',
  Good: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50',
  Fair: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50',
  'Needs attention': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50',
}

export default function HealthScoreBadge({ repo }: HealthScoreBadgeProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { score, label, breakdown } = computeHealthScore(repo)

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setShowBreakdown((s) => !s)}
        className={`w-full text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${TEXT_COLORS[label]}`}
      >
        ❤️ Health Score: {label} ({score}) →
      </button>

      {showBreakdown && (
        <>
          {/* Click-away overlay so the popover can be dismissed by clicking outside it */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowBreakdown(false)}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-20 bottom-full right-0 mb-2 w-56 max-w-[90vw] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 text-xs text-gray-600 dark:text-gray-300"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 dark:text-white">Health score breakdown</p>
              <button
                type="button"
                onClick={() => setShowBreakdown(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 leading-none"
              >
                ×
              </button>
            </div>
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
        </>
      )}
    </div>
  )
}