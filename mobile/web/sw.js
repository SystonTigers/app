/* Boost Huddle service worker.
 * - Page loads: network first, falling back to the saved app shell when offline.
 * - Built files (/_expo/static/*, icons): cache first; their names change every build.
 * - Anything else, including every call to the API, goes straight to the network.
 * - Match alerts (Web Push): shown as notifications; tapping one opens Live Match.
 * __BUILD_ID__ is replaced at build time so each release gets a fresh cache.
 */
const CACHE = 'boost-huddle-__BUILD_ID__';
// The app shell is served at "/" (Cloudflare redirects /index.html there)
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('boost-huddle-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API and other sites: untouched

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

// Match alerts sent by the server (backend services/push). Every push must show
// a notification: browsers stop delivering to sites that push silently.
self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    msg = { title: event.data ? event.data.text() : '' };
  }
  const title = msg.title || 'Match update';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-48.png',
      tag: msg.tag || undefined,
      renotify: !!msg.tag,
      data: msg.data || {},
    }),
  );
});

// Tap: bring the app forward (or open it) on Live Match
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const message = { type: 'open-screen', screen: data.screen || 'LiveMatch', fixtureId: data.fixtureId || null };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        open.postMessage(message);
        return open.focus();
      }
      return self.clients.openWindow('/?open=' + encodeURIComponent(message.screen));
    }),
  );
});
