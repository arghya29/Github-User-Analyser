import { useState } from 'react'
import type { UserData } from '@/types/github'

interface ExportButtonProps {
  userData: UserData
}

export default function ExportPanel({ userData }: ExportButtonProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [showBadge, setShowBadge] = useState(false)
  const [badgeCopied, setBadgeCopied] = useState(false)

  const login = userData.user.login

  // Point at your own Vercel deployment — or localhost during dev
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://github-user-analyser.vercel.app'

  const badgeUrl = `${baseUrl}/api/badge/${login}`
  const badgeMarkdown = `[![GitHub Stats](${badgeUrl})](${baseUrl})`

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    setPdfError('')

    try {
      const response = await fetch(`/api/export/pdf?username=${login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${login}-github-profile.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCopyBadge = async () => {
    try {
      await navigator.clipboard.writeText(badgeMarkdown)
      setBadgeCopied(true)
      setTimeout(() => setBadgeCopied(false), 2000)
    } catch {
      // clipboard access denied
    }
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Export & Share</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Download a resume-style PDF of this profile, or grab an SVG badge to embed in any README.
      </p>

      <div className="flex flex-wrap gap-3">
        {/* PDF Download */}
        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {pdfLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Download Resume PDF
            </>
          )}
        </button>

        {/* Badge toggle */}
        <button
          onClick={() => setShowBadge((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {showBadge ? 'Hide Badge' : 'Get README Badge'}
        </button>
      </div>

      {pdfError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{pdfError}</p>
      )}

      {showBadge && (
        <div className="mt-4 space-y-3">
          {/* Live badge preview */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeUrl}
            alt="GitHub Stats Badge"
            className="rounded-lg border border-gray-200 dark:border-slate-600"
          />

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Paste this into any GitHub README:
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-3 py-2 text-blue-600 dark:text-blue-400 overflow-x-auto whitespace-nowrap">
                {badgeMarkdown}
              </code>
              <button
                onClick={handleCopyBadge}
                className="shrink-0 px-3 py-2 text-xs bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
              >
                {badgeCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}