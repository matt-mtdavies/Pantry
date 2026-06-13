// Bump the version any time you change this file to force old clients to update.
const CACHE_NAME = 'pantry-v2'

// Install: claim clients immediately, no pre-caching of HTML
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API calls: always network, no caching
  if (url.pathname.startsWith('/api/')) return

  // HTML navigation (mode === 'navigate'): always network-first so index.html
  // is never stale. Vite chunk hashes change on every build; serving old HTML
  // that references old chunks causes a blank page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/') // offline fallback
      )
    )
    return
  }

  // Hashed assets (JS, CSS, fonts with content hashes in the filename):
  // cache-first — they are immutable once deployed.
  if (url.pathname.match(/\/assets\//) || url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached
          return fetch(event.request).then(res => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Images: cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(res => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
          return cached ?? networkFetch
        })
      )
    )
    return
  }

  // Everything else: network-first
  event.respondWith(fetch(event.request))
})
