import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getLanguageColor } from '@/lib/languageColors'

interface LanguageChartProps {
  data: { name: string; value: number }[]
  mode?: 'bytes' | 'count'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, mode }: any) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  const suffix = mode === 'bytes' ? '% of code' : entry.value === 1 ? ' repo' : ' repos'
  return (
    <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white shadow-lg">
      <span className="font-semibold">{entry.name}</span>: {entry.value}
      {suffix}
    </div>
  )
}

export default function LanguageChart({ data, mode = 'count' }: LanguageChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">No language data available</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-4">Language Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={getLanguageColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip mode={mode} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-300">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: getLanguageColor(entry.name) }}
            />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  )
}