import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const STORAGE_KEY = 'github-analyzer-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Read the saved/preferred theme once on mount (a tiny inline script in
  // _document.tsx already set the class on <html> before paint, this just
  // syncs React's state to match so the toggle button shows the right icon).
  useEffect(() => {
    let initial: Theme = 'dark'
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') {
        initial = saved
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        initial = 'light'
      }
    } catch {
      // localStorage unavailable — fall back to dark
    }
    setTheme(initial)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore write failures
    }
  }, [theme, mounted])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}