// Service worker caching strategy.
//
// Bump VERSION when this file changes so the `activate` handler evicts stale
// caches. A build step could derive VERSION from the deployment hash for fully
// automatic per-deploy eviction; as a static file it is versioned manually — but
// the network-first navigation strategy below is what actually prevents the
// "stale HTML after deploy" problem regardless of cache version, since the app
// shell is always fetched fresh (and therefore references current hashed chunks).
const VERSION = 'v2'
const STATIC_CACHE = `gh-analyzer-static-${VERSION}`
const RUNTIME_CACHE = `gh-analyzer-runtime-${VERSION}`

// Cap the runtime cache so it can't grow without bound in Cache Storage.
const RUNTIME_MAX_ENTRIES = 60

const STATIC_ASSETS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  // Take over as soon as the updated worker is installed.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Trim a cache to a maximum number of entries, oldest-first.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i])
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API calls.
  if (url.pathname.startsWith('/api/')) return

  // Only handle same-origin GETs.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Navigation / document requests -> network-first, so users always get the
  // latest app shell after a deploy (which references the current hashed
  // chunks). Fall back to cache only when the network is unavailable.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    )
    return
  }

  // Everything else (immutable /_next/static/* assets, etc.) -> cache-first,
  // populating a bounded runtime cache so Cache Storage can't grow forever.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache
              .put(request, clone)
              .then(() => trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES))
          })
        }
        return response
      })
    })
  )
})
