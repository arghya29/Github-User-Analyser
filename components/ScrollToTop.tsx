import { useState, useEffect } from 'react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return

    const toggleVisibility = () => {
      if (typeof window.scrollY === 'number') {
        setVisible(window.scrollY > 300)
      }
    }

    toggleVisibility()

    window.addEventListener('scroll', toggleVisibility)
    return () => {
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('scroll', toggleVisibility)
      }
    }
  }, [])

  const scrollToTop = () => {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 17a1 1 0 01-1-1V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 01-1 1z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}
