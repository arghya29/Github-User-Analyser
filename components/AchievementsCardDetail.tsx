import { useEffect } from 'react'

interface AchievementsCardDetailProps {
  achievement: {
    label: string
    value: number
    milestones: number[]
    unit: string
    description: string
    color: string
    icon: string
  }
  onClose: () => void
}

export default function AchievementsCardDetail({ achievement, onClose }: AchievementsCardDetailProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const completedMilestones = achievement.milestones.filter((m) => achievement.value >= m)
  const nextMilestone = achievement.milestones.find((m) => achievement.value < m) ?? null
  const currentLevel = completedMilestones.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-achievement-title"
    >
      <div
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden transition-all duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center mt-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 bg-gradient-to-br ${achievement.color} shadow-lg ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-slate-200 dark:ring-slate-700`}>
            <span>{achievement.icon}</span>
          </div>

          <h3 id="modal-achievement-title" className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            {achievement.label}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
            {achievement.description}
          </p>

          <div className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span className="text-gray-600 dark:text-gray-400">Level {currentLevel} achieved</span>
              <span className="text-blue-500">
                {achievement.value.toLocaleString()} {achievement.unit}
              </span>
            </div>
            
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${
                    nextMilestone
                      ? Math.min(
                          100,
                          Math.round(
                            ((achievement.value - (completedMilestones[completedMilestones.length - 1] ?? 0)) /
                              (nextMilestone - (completedMilestones[completedMilestones.length - 1] ?? 0))) *
                              100
                          )
                        )
                      : 100
                  }%`,
                }}
              />
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500 flex justify-between">
              <span>{completedMilestones[completedMilestones.length - 1]?.toLocaleString() ?? 0}</span>
              <span>Next Milestone: {nextMilestone ? nextMilestone.toLocaleString() : 'Maxed Out!'}</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-left text-gray-400 dark:text-gray-500">
              Milestone Checklist
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
              {achievement.milestones.map((m, i) => {
                const isPassed = achievement.value >= m
                return (
                  <div
                    key={m}
                    className={`flex items-center text-xs justify-between py-1 px-2.5 rounded-lg border ${
                      isPassed
                        ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400'
                        : 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Level {i + 1}</span>
                      <span>({m.toLocaleString()} {achievement.unit})</span>
                    </div>
                    {isPassed ? (
                      <span className="font-bold flex items-center gap-1">
                        ✓ Locked
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Locked</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
