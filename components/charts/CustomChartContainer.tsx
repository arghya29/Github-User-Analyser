import React, { ReactNode, useEffect, useState } from 'react'
import EmptyState from '@/components/EmptyState'

interface CustomChartContainerProps {
  title: string
  height?: number | string
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
}

export default function CustomChartContainer({
  title,
  height = 250,
  isEmpty = false,
  emptyMessage = 'No chart analytics data available.',
  children,
}: CustomChartContainerProps) {
  // 🛠️ FIX: Track whether the component has mounted on the client
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        {isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState type="chart" message={emptyMessage} />
          </div>
        ) : (
          <div style={{ height }} className="w-full relative">
            {/* 🛠️ FIX: Only render the chart children once safely mounted in the browser */}
            {isMounted ? children : null}
          </div>
        )}
      </div>
    </div>
  )
}
