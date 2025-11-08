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
