const CACHE_NAME = 'pantry-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
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

// Fetch strategy:
// - API calls: network-first (always fresh data)
// - Images: cache-first (immutable)
// - HTML/JS/CSS: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET
  if (event.request.method !== 'GET') return

  // API: network only
  if (url.pathname.startsWith('/api/')) return

  // Images: cache-first, long TTL
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)) {
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

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res.ok && event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request, res.clone())
          }
          return res
        }).catch(() => cached)
        return cached ?? networkFetch
      })
    )
  )
})
