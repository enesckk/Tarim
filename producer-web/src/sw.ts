/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

// Never cache authenticated API traffic.
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly())

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 4,
    }),
  ),
)

self.addEventListener('push', (event) => {
  let title = 'Tarım'
  let body = 'Yeni bir bildiriminiz var'
  let data: Record<string, unknown> = {}

  try {
    if (event.data) {
      const payload = event.data.json() as {
        title?: string
        body?: string
        data?: Record<string, unknown>
      }
      title = payload.title || title
      body = payload.body || body
      data = payload.data || {}
    }
  } catch {
    try {
      body = event.data?.text() || body
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data,
      lang: 'tr',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl =
    typeof event.notification.data?.url === 'string'
      ? event.notification.data.url
      : '/notifications'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetUrl)
          }
          return
        }
      }
      await self.clients.openWindow(targetUrl)
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
