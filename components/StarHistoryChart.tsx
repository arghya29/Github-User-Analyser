import { useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { StarEntry } from '@/types/github'

interface StarHistoryChartProps {
  data: StarEntry[]
  repoName: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function StarHistoryChart({ data, repoName }: StarHistoryChartProps) {
  const chartData = useMemo(() => {
    if (data.length > 50) {
      const sampled: StarEntry[] = []
      const step = Math.floor(data.length / 50)
      for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i])
      }
      if (sampled[sampled.length - 1]?.date !== data[data.length - 1]?.date) {
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
        ⭐ Star History — {repoName}
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => [value, 'Stars']}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// recharts line chart; its data is fetched once and then never changes while open.
export default memo(StarHistoryChart)
