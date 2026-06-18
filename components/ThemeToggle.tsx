import { useTheme } from '@/lib/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-gray-200"
    >
      {theme === 'dark' ? (
        // Sun icon — shown in dark mode, clicking switches to light
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 2a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM12 0a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1zm0 21a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM0 12a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1zm21 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1zM3.5 3.5a1 1 0 0 1 1.4 0l.8.7a1 1 0 1 1-1.4 1.5l-.8-.8a1 1 0 0 1 0-1.4zm14.8 14.8a1 1 0 0 1 1.4 0l.8.8a1 1 0 1 1-1.4 1.4l-.8-.8a1 1 0 0 1 0-1.4zM3.5 20.5a1 1 0 0 1 0-1.4l.8-.8a1 1 0 1 1 1.4 1.4l-.8.8a1 1 0 0 1-1.4 0zM18.3 3.5a1 1 0 0 1 1.4 1.4l-.8.8a1 1 0 1 1-1.4-1.5l.8-.7z" />
        </svg>
      ) : (
        // Moon icon — shown in light mode, clicking switches to dark
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.7 2a.9.9 0 0 1 .8 1.3 8 8 0 0 0 9.2 9.2.9.9 0 0 1 1.3.8 10 10 0 1 1-11.3-11.3z" />
        </svg>
      )}
    </button>
  )
}