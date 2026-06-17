import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { ProductivityStats } from '@/types/github'

interface ProductivityPanelProps {
  data: ProductivityStats
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ProductivityPanel({ data }: ProductivityPanelProps) {
  const { currentStreak, longestStreak, mostProductiveDay, weekdayCount, weekendCount, monthlyTotals } =
    data

  const total = weekdayCount + weekendCount
  const weekdayPct = total > 0 ? Math.round((weekdayCount / total) * 100) : 0
  const weekendPct = 100 - weekdayPct

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-white mb-4">Productivity</h3>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-600/50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-white">{currentStreak}</div>
          <div className="text-sm text-gray-400">Current streak</div>
        </div>
        <div className="bg-slate-600/50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-white">{longestStreak}</div>
          <div className="text-sm text-gray-400">Longest streak</div>
        </div>
        <div className="bg-slate-600/50 rounded p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {mostProductiveDay ? mostProductiveDay.count : 0}
          </div>
          <div className="text-sm text-gray-400">
            {mostProductiveDay ? `Best day (${formatDate(mostProductiveDay.date)})` : 'Best day'}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Weekdays {weekdayPct}%</span>
          <span>Weekends {weekendPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-600 overflow-hidden flex">
          <div className="bg-blue-500 h-full" style={{ width: `${weekdayPct}%` }} />
          <div className="bg-purple-400 h-full" style={{ width: `${weekendPct}%` }} />
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyTotals} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={({ active, payload, label }: any) => {
                if (!active || !payload || !payload.length) return null
                return (
                  <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white shadow-lg">
                    <div className="font-semibold">{label}</div>
                    <div>{payload[0].value} contributions</div>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}