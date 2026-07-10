import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { CodeFrequency } from '@/types/github'

interface CommitActivityChartProps {
  data: CodeFrequency[]
  repoName: string
}

function formatWeek(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CommitActivityChart({ data, repoName }: CommitActivityChartProps) {
  const chartData = useMemo(() => {
    if (data.length > 52) {
      const step = Math.floor(data.length / 52)
      const sampled: CodeFrequency[] = []
      for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i])
      }
      if (sampled[sampled.length - 1]?.week !== data[data.length - 1]?.week) {
        sampled.push(data[data.length - 1])
      }
      return sampled
    }
    return data
  }, [data])

  if (!data.length) return null

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 mt-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        📊 Commit Activity — {repoName}
      </h4>
      <div
        role="img"
        aria-label={`Weekly commit activity for ${repoName}: additions and deletions across ${chartData.length} week${
          chartData.length === 1 ? '' : 's'
        }.`}
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeek}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(label) => formatWeek(Number(label))}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="additions" fill="#22c55e" name="Additions" radius={[2, 2, 0, 0]} />
            <Bar dataKey="deletions" fill="#ef4444" name="Deletions" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
