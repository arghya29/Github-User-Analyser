import { useState, useEffect, useRef } from 'react'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

function getBreakpoint(width: number): Breakpoint {
  const entries = Object.entries(BREAKPOINTS) as [Breakpoint, number][]
  let result: Breakpoint = 'xs'
  for (const [bp, minWidth] of entries) {
    if (width >= minWidth) result = bp
  }
  return result
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let last = 0
  return ((...args: unknown[]) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }) as T
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('xs')
  const rafId = useRef<number>()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = throttle(() => setBp(getBreakpoint(window.innerWidth)), 100)
    onResize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return bp
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
