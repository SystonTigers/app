/**
 * @fileoverview Progressive Web App (PWA) asset service.
 * Provides manifest and service worker responses without relying on
 * binary assets so that deployments remain Apps Script friendly.
 */

/**
 * Routes requests for PWA assets (manifest and service worker).
 * @param {string} path Path segment from the incoming request.
 * @param {!Object<string, string>=} parameters Query parameters from the request.
 * @returns {ContentService.TextOutput|null} Response when handled.
 */
function handlePwaAssetRequest(path, parameters) {
  const assetParam = parameters && parameters.asset ? String(parameters.asset) : '';
  const selector = assetParam || path;
  if (!selector) {
    return null;
  }

  try {
    const normalized = String(selector).replace(/^\/+/, '');
    switch (normalized) {
      case 'manifest.json':
        return createPwaManifestResponse_();
      case 'service-worker.js':
        return createServiceWorkerResponse_();
      default:
        return null;
    }
  } catch (error) {
    console.error('handlePwaAssetRequest failed:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'PWA asset generation failed'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Builds the manifest JSON response.
 * @returns {ContentService.TextOutput}
 * @private
 */
function createPwaManifestResponse_() {
  const manifest = buildPwaManifest_();
  return ContentService.createTextOutput(JSON.stringify(manifest))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Generates the manifest object by projecting system configuration.
 * @returns {Object}
 * @private
 */
function buildPwaManifest_() {
  const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Club Console');
  const shortName = (getConfigValue('SYSTEM.CLUB_SHORT_NAME', clubName) || 'Club')
    .toString()
    .trim()
    .slice(0, 12);
  const description = getConfigValue('SYSTEM.DESCRIPTION', 'Unified automation console for football clubs.');
  const primaryColor = getConfigValue('BRANDING.PRIMARY_COLOR', '#0b3d91');
  const secondaryColor = getConfigValue('BRANDING.SECONDARY_COLOR', '#ffffff');

  const manifest = {
    id: '/',
    name: clubName,
    short_name: shortName,
    description: description,
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: secondaryColor,
    theme_color: primaryColor,
    lang: 'en-GB',
    categories: ['sports', 'productivity'],
    shortcuts: [
      {
        name: 'Match Console',
        short_name: 'Match',
        url: './?view=match'
      },
      {
        name: 'Setup Wizard',
        short_name: 'Setup',
        url: './?view=setup'
      }
    ]
  };

  const iconLabel = shortName || 'CC';
  const icons = buildPwaIcons_(primaryColor, secondaryColor, iconLabel);
  if (icons.length) {
    manifest.icons = icons;
  }

  return manifest;
}

/**
 * Builds inline SVG icons so no binary files are required.
 * @param {string} primaryColor
 * @param {string} secondaryColor
 * @param {string} label
 * @returns {Array<Object>}
 * @private
 */
function buildPwaIcons_(primaryColor, secondaryColor, label) {
  try {
    const text = (label || 'CC').toString().toUpperCase().slice(0, 3);
    const svg = generatePwaIconSvg_(primaryColor, secondaryColor, text);
    const encodedSvg = encodeURIComponent(svg)
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
    const src = `data:image/svg+xml,${encodedSvg}`;

    return [
      {
        src: src,
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: src,
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ];
  } catch (error) {
    console.error('buildPwaIcons_ failed:', error);
    return [];
  }
}

/**
 * Generates SVG markup for the icon.
 * @param {string} primaryColor
 * @param {string} secondaryColor
 * @param {string} text
 * @returns {string}
 * @private
 */
function generatePwaIconSvg_(primaryColor, secondaryColor, text) {
  const safePrimary = validateHexColor_(primaryColor, '#0b3d91');
  const safeSecondary = validateHexColor_(secondaryColor, '#ffffff');
  const safeText = text.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'CC';

  return `<?xml version="1.0" encoding="UTF-8"?>`
    + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
    + `<rect width="512" height="512" rx="48" ry="48" fill="${safePrimary}"/>`
    + `<circle cx="256" cy="256" r="200" fill="${safeSecondary}" opacity="0.15"/>`
    + `<text x="50%" y="55%" font-family="Montserrat, Arial, sans-serif" font-size="220" font-weight="700" fill="${safeSecondary}" text-anchor="middle">${safeText}</text>`
    + '</svg>';
}

/**
 * Validates a hex color and falls back to a default.
 * @param {string} value
 * @param {string} fallback
 * @returns {string}
 * @private
 */
function validateHexColor_(value, fallback) {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return fallback;
}

/**
 * Creates the service worker JavaScript response.
 * @returns {ContentService.TextOutput}
 * @private
 */
function createServiceWorkerResponse_() {
  const script = buildServiceWorkerSource_();
  return ContentService.createTextOutput(script)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Builds the service worker source code with version-aware caching.
 * @returns {string}
 * @private
 */
function buildServiceWorkerSource_() {
  const version = getConfigValue('SYSTEM.VERSION', '1.0.0');
  const cacheName = `club-console-shell-v${version}`;
  const preCache = JSON.stringify(['./', './?view=match', './?view=setup']);

  return `const CACHE_NAME = '${cacheName}';\n`
    + `const PRECACHE_URLS = ${preCache};\n`
    + "const OFFLINE_FALLBACK = './';\n\n"
    + 'self.addEventListener(\'install\', (event) => {\n'
    + '  event.waitUntil(\n'
    + '    caches.open(CACHE_NAME)\n'
    + '      .then((cache) => cache.addAll(PRECACHE_URLS))\n'
    + '      .then(() => self.skipWaiting())\n'
    + '  );\n'
    + '});\n\n'
    + 'self.addEventListener(\'activate\', (event) => {\n'
    + '  event.waitUntil(\n'
    + '    caches.keys().then((keys) => Promise.all(\n'
    + '      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))\n'
    + '    ))\n'
    + '  );\n'
    + '  self.clients.claim();\n'
    + '});\n\n'
    + 'self.addEventListener(\'fetch\', (event) => {\n'
    + '  const request = event.request;\n'
    + "  if (request.method !== 'GET') {\n"
    + '    return;\n'
    + '  }\n'
    + '  const url = new URL(request.url);\n'
    + "  if (url.pathname === '/manifest.json') {\n"
    + '    return;\n'
    + '  }\n'
    + "  if (request.mode === 'navigate') {\n"
    + '    event.respondWith(\n'
    + '      fetch(request)\n'
    + '        .then((response) => {\n'
    + '          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));\n'
    + '          return response;\n'
    + '        })\n'
    + '        .catch(() => caches.match(OFFLINE_FALLBACK))\n'
    + '    );\n'
    + '    return;\n'
    + '  }\n'
    + '  event.respondWith(\n'
    + '    caches.match(request)\n'
    + '      .then((cachedResponse) => {\n'
    + '        if (cachedResponse) {\n'
    + '          return cachedResponse;\n'
    + '        }\n'
    + '        return fetch(request)\n'
    + '          .then((networkResponse) => {\n'
    + '            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== \"basic\") {\n'
    + '              return networkResponse;\n'
    + '            }\n'
    + '            const responseToCache = networkResponse.clone();\n'
    + '            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));\n'
    + '            return networkResponse;\n'
    + '          })\n'
    + '          .catch(() => caches.match(OFFLINE_FALLBACK));\n'
    + '      })\n'
    + '  );\n'
    + '});\n';
}
