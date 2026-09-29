#!/usr/bin/env node
// Build the installable web version of the app into dist/.
//
//   node scripts/build-web.mjs
//
// Runs `expo export --platform web`, then adds what makes it installable
// (manifest, icons, service worker, home-screen meta tags). Deploy with
// `npx wrangler deploy -c wrangler.web.jsonc`.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const webDir = path.join(root, 'web');

const exported = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (exported.status !== 0) {
  console.error('✗ expo export failed');
  process.exit(exported.status || 1);
}

// Cloudflare's static hosting redirects paths containing "@" (e.g. the icon
// fonts under node_modules/@expo/...) in a loop, so rename those folders and
// point the bundle at the new paths.
function renameAtDirs(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const target = name.startsWith('@') ? path.join(dir, `_at_${name.slice(1)}`) : full;
    if (target !== full) renameSync(full, target);
    renameAtDirs(target);
  }
}
const assetsDir = path.join(dist, 'assets');
if (existsSync(assetsDir)) {
  renameAtDirs(assetsDir);
  const jsDir = path.join(dist, '_expo', 'static', 'js', 'web');
  for (const file of readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
    const full = path.join(jsDir, file);
    const code = readFileSync(full, 'utf8');
    const fixed = code.replace(/(\/assets\/[^"'`]*?)\/@/g, '$1/_at_');
    if (fixed !== code) writeFileSync(full, fixed);
  }
}

for (const item of ['manifest.webmanifest', '_headers', 'icons', 'splash', 'fonts']) {
  cpSync(path.join(webDir, item), path.join(dist, item), { recursive: true });
}

const buildId = Date.now().toString(36);
writeFileSync(path.join(dist, 'sw.js'), readFileSync(path.join(webDir, 'sw.js'), 'utf8').replaceAll('__BUILD_ID__', buildId));

const indexPath = path.join(dist, 'index.html');
if (!existsSync(indexPath)) {
  console.error('✗ dist/index.html is missing');
  process.exit(1);
}
let html = readFileSync(indexPath, 'utf8');
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);
/** iPhone launch screens (CSS width, height, pixel ratio): full-screen images made by scripts/make-splash.mjs */
const IOS_SPLASH = [[375, 667, 2], [414, 896, 2], [375, 812, 3], [414, 896, 3], [390, 844, 3], [393, 852, 3], [428, 926, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3]];
const head = [
  '<meta name="description" content="Fixtures, results, team news and match videos for your football club." />',
  '<meta name="theme-color" content="#0B0D0F" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Boost Huddle" />',
  '<link rel="manifest" href="/manifest.webmanifest" />',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
  '<link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png" />',
  ...IOS_SPLASH.map(([w, h, r]) => `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="/splash/splash-${w * r}x${h * r}.png" />`),
  "<style>@font-face{font-family:'BH Display';src:url(/fonts/BarlowCondensed-ExtraBold.ttf) format('truetype');font-display:swap}html,body{background:#06080B}</style>",
].join('\n    ');
html = html.replace('<link rel="icon" href="/favicon.ico" />', '').replace('</head>', `    ${head}\n  </head>`);
// Full-screen launch screen while the app's code loads (React replaces it when it starts)
html = html.replace('<div id="root"></div>', `<div id="root">${readFileSync(path.join(webDir, 'boot.html'), 'utf8').trim()}</div>`);
const register = `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}</script>`;
html = html.replace('</body>', `  ${register}\n</body>`);
writeFileSync(indexPath, html);

console.log(`✓ Web app built in dist/ (build ${buildId})`);
