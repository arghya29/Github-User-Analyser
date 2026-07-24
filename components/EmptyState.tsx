export type EmptyStateType = 'repositories' | 'chart' | 'search' | 'default'

interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  message: string
  icon?: string
}

const emptyStateConfig: Record<EmptyStateType, { icon: string; title: string }> = {
  repositories: { icon: '📦', title: 'No Repositories' },
  chart: { icon: '📊', title: 'No Data Yet' },
  search: { icon: '🔍', title: 'No Results' },
  default: { icon: '🗂️', title: 'Nothing Here' },
}

export default function EmptyState({ type = 'default', title, message, icon }: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const resolvedIcon = icon ?? config.icon
  const resolvedTitle = title ?? config.title

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50/50 dark:bg-slate-800/30">
      <div className="text-3xl mb-3" aria-hidden="true">
        {resolvedIcon}
      </div>
      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{resolvedTitle}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>
    </div>
  )
}
