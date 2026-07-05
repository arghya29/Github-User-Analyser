export default function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full animate-pulse">
      <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded w-1/3 mb-6" />
      <div className="flex justify-center items-center h-48">
        <div className="w-32 h-32 rounded-full border-8 border-slate-200 dark:border-slate-600 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-600/50" />
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-1/4" />
      </div>
    </div>
  )
}
