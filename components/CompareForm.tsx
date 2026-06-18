import { useState } from 'react'

interface CompareFormProps {
  onCompare: (userA: string, userB: string) => void
  loading: boolean
}

export default function CompareForm({ onCompare, loading }: CompareFormProps) {
  const [userA, setUserA] = useState('')
  const [userB, setUserB] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCompare(userA, userB)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <input
          type="text"
          value={userA}
          onChange={(e) => setUserA(e.target.value)}
          placeholder="First username..."
          className="flex-1 w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-400"
          disabled={loading}
        />
        <span className="text-gray-400 dark:text-gray-500 font-semibold text-sm shrink-0">vs</span>
        <input
          type="text"
          value={userB}
          onChange={(e) => setUserB(e.target.value)}
          placeholder="Second username..."
          className="flex-1 w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>
    </form>
  )
}