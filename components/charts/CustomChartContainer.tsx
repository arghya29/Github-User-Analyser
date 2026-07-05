import React, { ReactNode } from 'react'

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
  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
        {isEmpty ? (
          <div
            style={{ height }}
            className="flex items-center justify-center border border-dashed border-gray-200 dark:border-slate-600 rounded-xl"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          <div style={{ height }} className="w-full relative">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
