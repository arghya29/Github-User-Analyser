import { useEffect, useState } from 'react'
import Image from 'next/image'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Repository } from '@/types/github'

interface RepoReadmeModalProps {
  repo: Repository
  owner: string
  onClose: () => void
}

function resolveImageSrc(src: string | undefined, owner: string, repoName: string): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  // Best-effort fix for READMEs that reference images by relative path —
  // GitHub's raw content service accepts "HEAD" as an alias for the default branch.
  const cleanPath = src.replace(/^\.?\//, '')
  return `https://raw.githubusercontent.com/${owner}/${repoName}/HEAD/${cleanPath}`
}

function resolveLinkHref(href: string | undefined, owner: string, repoName: string): string | undefined {
  if (!href) return href
  // Leave absolute URLs (any scheme: http(s), mailto:, tel:, …), protocol-relative
  // URLs, and in-page anchors (#section) untouched. Everything else is a relative
  // link to a file in the repo — resolve it to GitHub's blob view so it doesn't
  // navigate within the analyzer app (which 404s) when clicked.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) {
    return href
  }
  const cleanPath = href.replace(/^\.?\//, '')
  return `https://github.com/${owner}/${repoName}/blob/HEAD/${cleanPath}`
}

function createComponents(owner: string, repoName: string): Components {
  return {
    h1: ({ ...props }) => (
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3" {...props} />
    ),
    h2: ({ ...props }) => (
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-2" {...props} />
    ),
    h3: ({ ...props }) => (
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2" {...props} />
    ),
    p: ({ ...props }) => (
      <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed" {...props} />
    ),
    a: ({ href, ...props }) => (
      <a
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        href={resolveLinkHref(href, owner, repoName)}
        {...props}
      />
    ),
    ul: ({ ...props }) => (
      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />
    ),
    ol: ({ ...props }) => (
      <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-3 space-y-1" {...props} />
    ),
    code: ({ ...props }) => (
      <code className="bg-gray-100 dark:bg-slate-700 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-sm" {...props} />
    ),
    pre: ({ ...props }) => (
      <pre className="bg-gray-100 dark:bg-slate-700 rounded p-4 overflow-x-auto mb-3 text-sm" {...props} />
    ),
    blockquote: ({ ...props }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-slate-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-3" {...props} />
    ),
    strong: ({ ...props }) => (
      <strong className="font-semibold text-gray-900 dark:text-white" {...props} />
    ),
    img: ({ src, alt, width, height, ...props }) => {
      const resolvedWidth = typeof width === 'number' ? width : 800
      const resolvedHeight = typeof height === 'number' ? height : 600

      return (
        <Image
          className="max-w-full rounded my-3"
          src={resolveImageSrc(src, owner, repoName)}
          alt={alt || ''}
          width={resolvedWidth}
          height={resolvedHeight}
          unoptimized
          {...props}
        />
      )
    },
    table: ({ ...props }) => (
      <table className="w-full text-sm border border-gray-200 dark:border-slate-600 mb-3" {...props} />
    ),
    th: ({ ...props }) => (
      <th className="border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 px-2 py-1 text-left text-gray-900 dark:text-white" {...props} />
    ),
    td: ({ ...props }) => (
      <td className="border border-gray-200 dark:border-slate-600 px-2 py-1 text-gray-700 dark:text-gray-300" {...props} />
    ),
  }
}

export default function RepoReadmeModal({ repo, owner, onClose }: RepoReadmeModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setContent(null)

    fetch(`/api/readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
        } else {
          setContent(data.content)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load README')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [owner, repo.name])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', handleEsc)
      }
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600 sticky top-0 bg-white dark:bg-slate-800">
          <h3 className="font-bold text-gray-900 dark:text-white truncate pr-4">{repo.name}</h3>
          <div className="flex items-center gap-4 shrink-0">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View on GitHub
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && <p className="text-gray-500 dark:text-gray-400 text-sm">Loading README...</p>}
          {error && <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>}
          {!loading && !error && content && (
            <div className="text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={createComponents(owner, repo.name) as Components}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}