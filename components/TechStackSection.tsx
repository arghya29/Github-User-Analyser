import dynamic from 'next/dynamic'
import ChartSkeleton from '@/components/charts/ChartSkeleton'
// Below the fold and recharts-backed: split it out so it streams in behind a
// skeleton instead of blocking the initial page bundle.
// `ssr: false` is safe here rather than a behaviour change: the dashboard only
// renders after the client-side profile fetch resolves, so this never rendered
// on the server to begin with.
const LanguageChart = dynamic(() => import('@/components/LanguageChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
import LanguageDashboard from '@/components/LanguageDashboard'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import type { Repository } from '@/types/github'

interface TechStackSectionProps {
  repos: Repository[]
  pieData: { name: string; value: number }[]
  usingByteData: boolean
}

/**
 * Presentational "Techstack" section: the language pie chart and the language
 * dashboard. Receives already-computed language data; holds no state or logic.
 */
export default function TechStackSection({ repos, pieData, usingByteData }: TechStackSectionProps) {
  return (
    <section id="techstack" className="scroll-mt-24">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Techstack</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary fallback={ErrorFallback}>
          <LanguageChart data={pieData} mode={usingByteData ? 'bytes' : 'count'} />
        </ErrorBoundary>
        <ErrorBoundary fallback={ErrorFallback}>
          <LanguageDashboard repos={repos} />
        </ErrorBoundary>
      </div>
    </section>
  )
}
