// Owner panel app: lets phones install /owner as its own app. Every request
// goes straight to the network; nothing is cached, so club data never sits
// on the device.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
