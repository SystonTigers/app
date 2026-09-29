/**
 * Makes the iPhone launch screens (web/splash/*.png) from web/boot.html, the
 * same launch screen the web app shows while it loads.
 * Run after changing web/boot.html: node scripts/make-splash.mjs
 * Needs Playwright's Chromium (the repo root's dev dependency).
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..', 'web');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

// CSS width, height and pixel ratio of each iPhone size (must match IOS_SPLASH in build-web.mjs)
const SIZES = [[375, 667, 2], [414, 896, 2], [375, 812, 3], [414, 896, 3], [390, 844, 3], [393, 852, 3], [428, 926, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3]];

const boot = readFileSync(path.join(web, 'boot.html'), 'utf8').replaceAll('/icons/', `${pathToFileURL(path.join(web, 'icons')).href}/`);
const font = pathToFileURL(path.join(web, 'fonts', 'BarlowCondensed-ExtraBold.ttf')).href;
const page = `<!doctype html><html><head><style>@font-face{font-family:'BH Display';src:url(${font})}html,body{margin:0;background:#06080B}</style></head><body>${boot}</body></html>`;

// Opened as a file next to the images, so the page may load them
const tmp = path.join(web, '.splash-page.html');
writeFileSync(tmp, page);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [w, h, r] of SIZES) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: r });
  await p.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(web, 'splash', `splash-${w * r}x${h * r}.png`) });
  await p.close();
}
await browser.close();
rmSync(tmp);
console.log(`✓ ${SIZES.length} launch screens in web/splash/`);
