function ShimmerBlock({ className }: { className: string }) {
  return <div className={`shimmer rounded ${className}`} />
}

export function UserCardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <ShimmerBlock className="w-32 h-32 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <ShimmerBlock className="h-8 w-48" />
            <ShimmerBlock className="h-4 w-32" />
            <ShimmerBlock className="h-4 w-full max-w-md" />
            <div className="grid grid-cols-3 gap-4 mt-2">
              <ShimmerBlock className="h-16" />
              <ShimmerBlock className="h-16" />
              <ShimmerBlock className="h-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RepoCardSkeleton() {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 space-y-4">
      <ShimmerBlock className="h-6 w-2/3" />
      <ShimmerBlock className="h-4 w-full" />
      <ShimmerBlock className="h-4 w-1/3" />
      <div className="flex gap-6">
        <ShimmerBlock className="h-4 w-10" />
        <ShimmerBlock className="h-4 w-10" />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full">
      <ShimmerBlock className="h-5 w-40 mb-4" />
      <ShimmerBlock className="h-56 w-full" />
    </div>
  )
}

export default function LoadingSkeleton() {
  return (
    <div className="space-y-12">
      <UserCardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <RepoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}