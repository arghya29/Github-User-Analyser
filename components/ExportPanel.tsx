import { useState } from 'react'
import Image from 'next/image'
import type { UserData } from '@/types/github'
import {
  formatAsJSON,
  formatAsMarkdown,
  ALL_EXPORT_SECTIONS,
  type ExportSection,
} from '@/lib/exportDataFormatter'

const SECTION_LABELS: Record<ExportSection, string> = {
  profile: 'Profile',
  repositories: 'Repositories',
  contributions: 'Contributions',
  engagement: 'Engagement',
  productivity: 'Productivity',
}

interface ExportButtonProps {
  userData: UserData
}

export default function ExportPanel({ userData }: ExportButtonProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [csvError, setCsvError] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [mdError, setMdError] = useState('')
  const [selectedSections, setSelectedSections] =
    useState<ExportSection[]>(ALL_EXPORT_SECTIONS)

  const toggleSection = (section: ExportSection) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }
  const [showBadge, setShowBadge] = useState(false)
  const [badgeCopied, setBadgeCopied] = useState(false)

  const login = userData.user.login

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
        const err = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Failed to generate PDF')
      }

      const blob = await response.blob()
      if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        return
      }
      const url = URL.createObjectURL(blob)
      if (typeof document === 'undefined') {
        URL.revokeObjectURL(url)
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `${login}-github-profile.pdf`
      if (document.body) {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadCsv = async () => {
    setCsvLoading(true)
    setCsvError('')

    try {
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate CSV')
      }

      const blob = await response.blob()
      if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        return
      }
      const url = URL.createObjectURL(blob)
      if (typeof document === 'undefined') {
        URL.revokeObjectURL(url)
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `${login}-repositories.csv`
      if (document.body) {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Failed to generate CSV')
    } finally {
      setCsvLoading(false)
    }
  }

  const handleDownloadJson = () => {
    setJsonError('')
    try {
      const jsonStr = formatAsJSON(userData, selectedSections)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        return
      }
      const url = URL.createObjectURL(blob)
      if (typeof document === 'undefined') {
        URL.revokeObjectURL(url)
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `${login}-profile-analytics.json`
      if (document.body) {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    } catch {
      setJsonError('Failed to generate JSON')
    }
  }

  const handleDownloadMarkdown = () => {
    setMdError('')
    try {
      const md = formatAsMarkdown(userData)
      const blob = new Blob([md], { type: 'text/markdown' })
      if (
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        return
      }
      const url = URL.createObjectURL(blob)
      if (typeof document === 'undefined') {
        URL.revokeObjectURL(url)
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `${login}-profile.md`
      if (document.body) {
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    } catch {
      setMdError('Failed to generate Markdown')
    }
  }

  const handleCopyBadge = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText)
        return
      await navigator.clipboard.writeText(badgeMarkdown)
      setBadgeCopied(true)
      setTimeout(() => setBadgeCopied(false), 2000)
    } catch {
      // clipboard access denied
    }
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        Export & Share
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Download a resume PDF of this profile, export repository lists as CSV,
        or obtain complete JSON metadata.
      </p>

      <div className="flex flex-wrap items-start gap-3">
        {/* PDF Download */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {pdfLoading ? 'Generating PDF...' : 'Download Resume PDF'}
          </button>
          {pdfError && (
            <p className="text-xs text-red-600 dark:text-red-400 max-w-[14rem]">
              {pdfError}
            </p>
          )}
        </div>

        {/* CSV Download */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleDownloadCsv}
            disabled={csvLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors"
          >
            {csvLoading ? 'Generating CSV...' : 'Export Repos CSV'}
          </button>
          {csvError && (
            <p className="text-xs text-red-600 dark:text-red-400 max-w-[14rem]">
              {csvError}
            </p>
          )}
        </div>

        {/* JSON Export */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleDownloadJson}
            disabled={selectedSections.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Export Raw JSON
          </button>
          {jsonError && (
            <p className="text-xs text-red-600 dark:text-red-400 max-w-[14rem]">
              {jsonError}
            </p>
          )}
        </div>

        {/* Markdown Export */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            Export Markdown
          </button>
          {mdError && (
            <p className="text-xs text-red-600 dark:text-red-400 max-w-[14rem]">
              {mdError}
            </p>
          )}
        </div>

        {/* Badge toggle */}
        <button
          onClick={() => setShowBadge((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          {showBadge ? 'Hide Badge' : 'Get README Badge'}
        </button>
      </div>

      {/* Section selection for the JSON export */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Sections to include in the JSON export:
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ALL_EXPORT_SECTIONS.map((section) => (
            <label
              key={section}
              className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selectedSections.includes(section)}
                onChange={() => toggleSection(section)}
                className="rounded border-gray-300 dark:border-slate-500 text-amber-600 focus:ring-amber-500"
              />
              {SECTION_LABELS[section]}
            </label>
          ))}
        </div>
      </div>

      {showBadge && (
        <div className="mt-4 space-y-3">
          <Image
            src={badgeUrl}
            alt="GitHub Stats Badge"
            width={600}
            height={200}
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
