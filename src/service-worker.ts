import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<any>;
};

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async () => {
    return fetch('/');
  }
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate()
);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Calcetto Scarsi', {
      body: data.body ?? '',
      icon: '/icons/android/android-launchericon-192-192.png',
      badge: '/icons/android/android-launchericon-192-192.png',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});
