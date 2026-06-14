// Immediately unregister this service worker and clear all caches
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  await self.clients.claim()
  self.clients.matchAll().then(clients =>
    clients.forEach(c => c.postMessage({ type: 'SW_UNREGISTERED' }))
  )
  self.registration.unregister()
})
