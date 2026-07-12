import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { ThemeProvider } from '@/lib/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { logError } from '@/lib/errorLogger'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import ScrollToTop from '@/components/ScrollToTop'

function registerServiceWorker() {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof navigator.serviceWorker?.register !== 'function' ||
    process.env.NODE_ENV !== 'production'
  ) {
    return
  }

  navigator.serviceWorker.register('/sw.js').catch((err) => {
    logError('ServiceWorker', err)
  })
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    registerServiceWorker()
  }, [])

  useEffect(() => {
    const handleRouteChange = () => {
      // placeholder for analytics page tracking
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <ThemeProvider>
      <ErrorBoundary onError={(err, errorInfo) => logError('App', err, errorInfo)}>
        <Component {...pageProps} />
        <ScrollToTop />
      </ErrorBoundary>
    </ThemeProvider>
  )
}