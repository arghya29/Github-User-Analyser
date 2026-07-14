import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { resolveBaseUrl } from '@/lib/siteUrl'
import { fetchUserData } from '@/lib/github'
import { sanitizeUsername, validateUsername } from '@/lib/validation'
import CompareForm from '@/components/CompareForm'
import CompareResult from '@/components/CompareResult'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ThemeToggle from '@/components/ThemeToggle'
import Footer from '@/components/Footer'
import type { UserData } from '@/types/github'

interface OgMeta {
  title: string
  description: string
  /** Root-relative, and deliberately so — see getServerSideProps. */
  canonical: string
  url: string
  image: string
}

interface ComparePageProps {
  /** Sanitized. Never the raw query value — see getServerSideProps. */
  user1: string
  user2: string
  /** Set when a username in the URL is malformed, so we never fetch it. */
  invalidReason: string | null
  og: OgMeta
}

export default function ComparePage({ user1, user2, invalidReason, og }: ComparePageProps) {
  const router = useRouter()

  const hasBoth = Boolean(user1 && user2)
  const shouldFetch = hasBoth && !invalidReason

  // Results and failures are stored *with the pair they belong to*, and the render state is derived
  // from whether that pair still matches the URL. Two bugs fall out of doing it this way rather than
  // keeping a `loading` boolean:
  //
  //  - a pasted link no longer flashes. The server has no data yet, so a stored `loading = false`
  //    ships HTML showing an empty panel, and the skeleton only appears once the effect runs on the
  //    client — visibly empty, then skeleton, then results. Derived, `isPending` is already true
  //    during the server render, so the skeleton is in the very first byte of HTML.
  //
  //  - a stale comparison can never be painted under a new URL. Navigating from one pair to another
  //    changes the props before any effect can clear the old state, so for one frame the previous
  //    result would render beneath the new query string. Tagging the data with its pair makes that
  //    impossible: it simply stops matching.
  const [result, setResult] = useState<{ pair: string; userA: UserData; userB: UserData } | null>(
    null
  )
  const [failure, setFailure] = useState<{ pair: string; message: string } | null>(null)

  // Navigation is a separate concern from the fetch. `router.push` returns a promise that can
  // reject, and until it settles the new query hasn't landed — so without this the form stays live
  // during the round-trip and a second submission can be fired underneath the first.
  const [navigating, setNavigating] = useState(false)
  const [navError, setNavError] = useState('')

  const pairKey = `${user1}|${user2}`
  const current = result?.pair === pairKey ? result : null
  const error = failure?.pair === pairKey ? failure.message : ''
  const isPending = shouldFetch && !current && !error

  useEffect(() => {
    // Nothing to fetch: either the URL carries no pair, or one of the names is malformed and was
    // rejected server-side. Either way we render a message, not a request.
    if (!shouldFetch) return

    // If someone runs a second comparison before the first resolves, the slower response must not
    // overwrite the newer one.
    let cancelled = false
    const pair = `${user1}|${user2}`

    Promise.all([fetchUserData(user1), fetchUserData(user2)])
      .then(([dataA, dataB]) => {
        if (cancelled) return

        // `fetchUserData` resolves every status and reports the failure on `data.error`, so a bad
        // username stays attributable to *which* user it was rather than collapsing into a single
        // "something went wrong" — the behaviour the home page had, kept here.
        if (dataA.error) {
          setFailure({ pair, message: `${user1}: ${dataA.error}` })
        } else if (dataB.error) {
          setFailure({ pair, message: `${user2}: ${dataB.error}` })
        } else {
          setResult({ pair, userA: dataA, userB: dataB })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailure({ pair, message: 'Failed to fetch one or both profiles' })
        }
      })

    return () => {
      cancelled = true
    }
    // Re-runs whenever the URL changes, which is what makes a refresh, a Back and a pasted link all
    // behave identically — the query string is the single source of truth for this page.
  }, [user1, user2, shouldFetch])

  const handleCompare = async (rawA: string, rawB: string) => {
    const nextA = rawA.trim()
    const nextB = rawB.trim()
    if (!nextA || !nextB) return

    setNavError('')
    setNavigating(true)

    try {
      // `push`, not `replace`, so Back returns to the previous comparison rather than skipping out
      // of the page entirely. Awaited, so the form stays disabled until the new query has actually
      // landed, and a rejected navigation surfaces instead of being swallowed.
      await router.push({ pathname: '/compare', query: { user1: nextA, user2: nextB } })
    } catch {
      setNavError('Could not open that comparison')
    } finally {
      setNavigating(false)
    }
  }

  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta name="description" content={og.description} />
        <link rel="canonical" href={og.canonical} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GitHub User Analyser" />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GitHub User Analyser" />
        <meta property="og:url" content={og.url} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
      </Head>

      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <main className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#020617,#0f172a)]">
          <div className="mx-auto max-w-6xl px-4 pt-0 lg:pt-4 pb-10 sm:pb-12 lg:pb-16">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-4 no-underline">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-300/20 dark:text-cyan-300">
                  <span className="text-xl font-semibold">GH</span>
                </div>
                <p className="text-2xl font-semibold text-cyan-700 sm:text-3xl dark:text-cyan-300">
                  GitHub User Analyser
                </p>
              </Link>
              <ThemeToggle />
            </div>

            <div className="rounded-[2rem] border border-slate-200/20 bg-white/90 px-6 pt-5 pb-6 shadow-2xl shadow-slate-900/5 sm:px-8 dark:border-white/10 dark:bg-slate-900/90 dark:shadow-slate-950/30">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Compare
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {hasBoth ? `${user1} vs ${user2}` : 'Compare GitHub profiles'}
                </h1>
              </div>

              <div className="space-y-3">
                {/*
                  `key` deliberately: useState only reads its initial value on mount, so without a
                  remount the fields would keep showing the *previous* pair after navigating from one
                  comparison to another. Keying on the pair is React's documented way to reset state
                  when the identity of the thing being edited changes.
                */}
                <CompareForm
                  key={pairKey}
                  initialUserA={user1}
                  initialUserB={user2}
                  onCompare={handleCompare}
                  loading={isPending || navigating}
                />

                {/*
                  role="alert" so assistive tech announces these when they appear — they're rendered
                  conditionally, and without it a screen-reader user gets no signal that the link
                  they opened was rejected or that a comparison failed. Matches ErrorState.tsx,
                  which already does this; this page simply wasn't following the convention.
                */}
                {invalidReason && (
                  <div role="alert" className="text-sm text-rose-500 dark:text-rose-300">
                    {invalidReason}
                  </div>
                )}

                {navError && (
                  <div role="alert" className="text-sm text-rose-500 dark:text-rose-300">
                    {navError}
                  </div>
                )}

                {error && !invalidReason && (
                  <div role="alert" className="text-sm text-rose-500 dark:text-rose-300">
                    {error}
                  </div>
                )}

                {isPending && <LoadingSkeleton />}

                {!isPending && !error && !invalidReason && current && (
                  <CompareResult userA={current.userA} userB={current.userB} />
                )}

                {!isPending && !error && !invalidReason && !hasBoth && (
                  <div className="text-slate-600 dark:text-slate-300">
                    Add two usernames to compare their public GitHub stats.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ComparePageProps> = async ({ query, req }) => {
  // A query string is allowed to repeat a key (`?user1=a&user1=b`), which Next surfaces as an array.
  // Take the first, the same way /[username] handles its route param.
  const first = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value) ?? ''

  const rawUser1 = first(query.user1).trim()
  const rawUser2 = first(query.user2).trim()

  // Validate the *raw* value. Sanitizing first would quietly rewrite `torva!ds` into `torvalds` and
  // then compare a user the link never asked for — the address bar and the page must not disagree.
  const checkedA = validateUsername(rawUser1)
  const checkedB = validateUsername(rawUser2)

  // ...but sanitize before any of it reaches the page. `sanitizeUsername` strips everything outside
  // [a-zA-Z0-9-], so from this line down nothing is attacker-controlled: not the props, not the OG
  // tags, not the canonical href, not the form values.
  //
  // Validating and then passing the raw value through anyway — which is what this did before — is
  // exactly the reflected-input shape CodeQL flagged. React would have escaped it on render, but
  // relying on that is relying on a downstream accident rather than on a boundary.
  const user1 = sanitizeUsername(rawUser1)
  const user2 = sanitizeUsername(rawUser2)

  // The message says which field is broken and why, and deliberately does not echo the input back —
  // there is no reason for a page to repeat an attacker's string in order to reject it. Each
  // `reason` is one of three fixed strings from validateUsername.
  let invalidReason: string | null = null
  if (rawUser1 || rawUser2) {
    if (!checkedA.valid) {
      invalidReason = `First username: ${checkedA.reason}`
    } else if (!checkedB.valid) {
      invalidReason = `Second username: ${checkedB.reason}`
    }
  }

  // `resolveBaseUrl` prefers NEXT_PUBLIC_SITE_URL, but when that isn't configured it falls back to
  // `x-forwarded-proto` / `x-forwarded-host` / `host` — every one of which is set by the *client*.
  // Two consequences, both of which CodeQL flagged and both of which are real:
  //
  //   - a request carrying `X-Forwarded-Proto: javascript` yields a `javascript:...` base. Inside a
  //     <link href> that is a live XSS sink, not a theoretical one.
  //   - a spoofed `X-Forwarded-Host` puts an off-site origin into og:url and the canonical link.
  //
  // So the resolved value is parsed rather than trusted: only a well-formed http(s) origin survives,
  // and a `javascript:` (or any other) scheme is discarded outright.
  const safeOrigin = ((): string => {
    const candidate = resolveBaseUrl(req)
    if (!candidate) return ''
    try {
      const parsed = new URL(candidate)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : ''
    } catch {
      return ''
    }
  })()

  const showPair = Boolean(user1 && user2) && !invalidReason

  // Derived from the query alone — no GitHub call — so the page renders with no added latency. This
  // mirrors how /[username] builds its tags from the route rather than from fetched data.
  const title = showPair
    ? `${user1} vs ${user2} · GitHub User Analyser`
    : 'Compare · GitHub User Analyser'

  const description = showPair
    ? `Compare @${user1} and @${user2} side by side — repositories, stars, languages and contribution activity.`
    : 'Compare two GitHub profiles side by side.'

  const path = showPair
    ? `/compare?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
    : '/compare'

  const og: OgMeta = {
    title,
    description,
    // The canonical link is emitted root-relative, always. A relative canonical is valid HTML, and
    // keeping a header-derived origin out of an `href` removes the sink outright rather than trying
    // to sanitize attacker-influenced input into one. `path` is built here from sanitized,
    // percent-encoded names, so it carries nothing from the request but the two usernames.
    canonical: path,
    // og:url and og:image are <meta content> values — read by crawlers, never navigated by the
    // browser — and the Open Graph spec wants them absolute so the image resolves. They use the
    // parsed, protocol-checked origin above.
    url: safeOrigin ? `${safeOrigin}${path}` : path,
    image: safeOrigin ? `${safeOrigin}/og-default.png` : '/og-default.png',
  }

  return { props: { user1, user2, invalidReason, og } }
}
