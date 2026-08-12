/* Background Web Push support loaded by the generated Workbox service worker. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Tarım";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Yeni bir güncelleme var.",
      icon: data.icon || "/pwa-192x192.png",
      badge: data.badge || "/pwa-192x192.png",
      data: { url: data.url || "/producer/notifications" },
      tag: data.tag || data.url || title,
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/producer/notifications",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(target).then((client) => client?.focus());
      }
      return self.clients.openWindow(target);
    }),
  );
});
