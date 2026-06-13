// This service worker intentionally unregisters itself and clears all caches.
// A stale-while-revalidate strategy for index.html caused blank pages when
// Vite chunk hashes changed between deployments.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(n => caches.delete(n)))
  await self.registration.unregister()
})
