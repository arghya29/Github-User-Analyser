import { aggregateLanguagesByCount } from '@/lib/repoStats'
import { getLanguageColor } from '@/lib/languageColors'
import type { UserData } from '@/types/github'

interface CompareLanguagesProps {
  userA: UserData
  userB: UserData
}

const TOP_N = 6

function LanguageList({
  languages,
}: {
  languages: { name: string; count: number }[]
}) {
  return (
    <ul className="space-y-1.5">
      {languages.map((lang) => (
        <li key={lang.name} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getLanguageColor(lang.name) }}
          />
          <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">
            {lang.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {lang.count}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LangGroup({
  label,
  names,
  className,
}: {
  label: string
  names: string[]
  className: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-semibold shrink-0 ${className}`}>{label}:</span>
      {names.length > 0 ? (
        <span className="text-gray-600 dark:text-gray-300">
          {names.join(', ')}
        </span>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">none</span>
      )}
    </div>
  )
}

/**
 * Side-by-side language-distribution comparison for two users, plus a
 * shared / unique-to-each summary. Reuses `aggregateLanguagesByCount` (the same
 * per-repo-count aggregation the single-profile dashboard uses) rather than
 * duplicating any language logic.
 */
export default function CompareLanguages({
  userA,
  userB,
}: CompareLanguagesProps) {
  const langsA = aggregateLanguagesByCount(userA.repos)
  const langsB = aggregateLanguagesByCount(userB.repos)

  // Nothing to compare if neither user has any language data.
  if (langsA.length === 0 && langsB.length === 0) return null

  const namesA = new Set(langsA.map((l) => l.name))
  const namesB = new Set(langsB.map((l) => l.name))
  const shared = langsA.filter((l) => namesB.has(l.name)).map((l) => l.name)
  const uniqueA = langsA.filter((l) => !namesB.has(l.name)).map((l) => l.name)
  const uniqueB = langsB.filter((l) => !namesA.has(l.name)).map((l) => l.name)

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 text-center">
        Language Distribution
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-6">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 truncate">
            @{userA.user.login}
          </div>
          {langsA.length > 0 ? (
            <LanguageList languages={langsA.slice(0, TOP_N)} />
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No language data
            </p>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 truncate">
            @{userB.user.login}
          </div>
          {langsB.length > 0 ? (
            <LanguageList languages={langsB.slice(0, TOP_N)} />
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No language data
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <LangGroup
          label="Shared"
          names={shared}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <LangGroup
          label={`Only @${userA.user.login}`}
          names={uniqueA}
          className="text-blue-600 dark:text-blue-400"
        />
        <LangGroup
          label={`Only @${userB.user.login}`}
          names={uniqueB}
          className="text-purple-600 dark:text-purple-400"
        />
      </div>
    </div>
  )
}
