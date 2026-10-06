#!/usr/bin/env node
// Look at the web app in a real browser, the way a parent would on their phone.
//
//   npm run browser-check                      # every screen in SCREENS below
//   npm run browser-check -- results stats     # just these (paths from linking.ts)
//   npm run browser-check -- --skip-build      # reuse the last web build
//
// Everything runs on this computer against a throwaway copy of the club:
//   1. builds the local database (backend/: migrations + the syston-tigers seed)
//   2. creates a test admin with a random password (never shown or saved)
//   3. starts the backend (wrangler dev) and the web app (built from mobile/)
//   4. signs in at phone size, opens each screen and saves a screenshot
// The live app, its database and real people's accounts are never touched.
//
// Output: .browser-check/screens/<screen>.png and .browser-check/report.md
// (git-ignored). Exits 1 if any screen showed an error, crashed or had a
// failing request, so Claude (or CI) can tell at a glance.
//
// Needs: `npm install` in the repo's top folder (backend + web-app, which brings
// Playwright) and in mobile/, and once per machine: `cd web-app && npx playwright install chromium`.

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(mobile, '..');
const backend = path.join(repo, 'backend');
const out = path.join(mobile, '.browser-check');
const webOut = path.join(out, 'web');
const shotsDir = path.join(out, 'screens');

const API_PORT = 8787;
const WEB_PORT = 4173;
const API = `http://127.0.0.1:${API_PORT}`;
const WEB = `http://127.0.0.1:${WEB_PORT}`;
const CLUB = 'syston-tigers';
const EMAIL = 'browser-check@example.test';
const WIN = process.platform === 'win32';

/** Screens checked by default: what members open most, then the staff zone. Paths from navigation/linking.ts. */
const SCREENS = [
  '', 'matches', 'squad', 'videos', 'results', 'table', 'stats', 'live', 'man-of-the-match',
  'training', 'drills', 'gallery', 'highlights', 'people', 'profile', 'consent', 'settings',
  'manage', 'manage/squad', 'manage/fixtures', 'manage/club-settings', 'match-centre',
];

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const picked = args.filter((a) => !a.startsWith('--'));
const screens = picked.length ? picked.map((p) => p.replace(/^\/+/, '')) : SCREENS;

const children = [];
function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (WIN) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  }
}
process.on('SIGINT', () => { stopAll(); process.exit(130); });

function fail(message) {
  console.error(`✗ ${message}`);
  stopAll();
  process.exit(1);
}

/** Run a command to completion, quietly unless it fails. */
function run(label, cmd, cmdArgs, cwd, env = {}) {
  process.stdout.write(`• ${label}… `);
  const res = spawnSync(cmd, cmdArgs, { cwd, env: { ...process.env, CI: '1', ...env }, encoding: 'utf8', shell: WIN });
  if (res.status !== 0) {
    console.log('failed');
    console.error((res.stdout || '') + (res.stderr || ''));
    fail(`${label} failed`);
  }
  console.log('done');
}

async function waitFor(url, label, seconds = 90) {
  for (let i = 0; i < seconds * 2; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  fail(`${label} didn't start within ${seconds}s (${url})`);
}

/** Serve the exported app; unknown paths get index.html so /results etc. open directly. */
function serveWeb() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
  const server = createServer((req, res) => {
    const clean = decodeURIComponent(new URL(req.url || '/', WEB).pathname);
    let file = path.join(webOut, path.normalize(clean));
    if (!file.startsWith(webOut) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(webOut, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(WEB_PORT, '127.0.0.1', () => resolve(server)));
}

function loadPlaywright() {
  try {
    return createRequire(path.join(repo, 'web-app', 'package.json'))('@playwright/test');
  } catch {
    return fail('Playwright is missing: run `npm install` in the top folder of the repo, then `npx playwright install chromium` in web-app/.');
  }
}

// 1-2. Local database with the test club and a test admin
const password = randomBytes(18).toString('base64url');
run('Building the local database', 'npx', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--local'], backend);
run('Adding the test club', 'npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--file=./scripts/seed-syston.sql'], backend);
run('Creating the test admin', 'node', ['scripts/set-admin-password.mjs'], backend, { SYSTON_ADMIN_EMAIL: EMAIL, SYSTON_ADMIN_PASSWORD: password, SYSTON_TENANT_SLUG: CLUB });

// 3. Backend and web app
console.log('• Starting the backend…');
const api = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(API_PORT), '--ip', '127.0.0.1',
  // A fresh signing key each run: local tokens never work anywhere else
  '--var', `JWT_SECRET:${randomBytes(32).toString('base64url')}`,
  '--var', 'ENVIRONMENT:development', '--var', `CORS_ALLOWED:${WEB}`, '--var', 'SOCIAL_BACKGROUND_DRAWING:off', '--var', 'LINK_PREVIEWS:off'],
{ cwd: backend, env: { ...process.env, CI: '1' }, stdio: 'ignore', shell: WIN, detached: !WIN });
children.push(api);
await waitFor(`${API}/healthz`, 'The backend');

if (!skipBuild || !existsSync(path.join(webOut, 'index.html'))) {
  rmSync(webOut, { recursive: true, force: true });
  run('Building the web app (takes a minute or two)', 'npx', ['expo', 'export', '--platform', 'web', '--output-dir', path.relative(mobile, webOut)], mobile,
    { EXPO_PUBLIC_API_BASE: API, EXPO_PUBLIC_TENANT_ID: CLUB, EXPO_PUBLIC_E2E: '1', EXPO_PUBLIC_SENTRY_DSN: '' });
}
const web = await serveWeb();

// 4. Sign in at phone size and look at every screen
const { chromium } = loadPlaywright();
rmSync(shotsDir, { recursive: true, force: true });
mkdirSync(shotsDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();

let problems = [];
// "Failed to load resource" lines carry no address; our own failing requests are caught below instead
page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) problems.push(`console: ${msg.text().slice(0, 300)}`); });
page.on('pageerror', (err) => problems.push(`crash: ${err.message.slice(0, 300)}`));
// Requests cancelled because the check moved to the next page aren't bugs
page.on('requestfailed', (req) => {
  if (req.url().startsWith(API) && !/ERR_ABORTED|NS_BINDING_ABORTED/.test(req.failure()?.errorText || '')) {
    problems.push(`request failed: ${req.method()} ${req.url().replace(API, '')} (${req.failure()?.errorText || 'no reply'})`);
  }
});
page.on('response', (res) => { if (res.url().startsWith(API) && res.status() >= 500) problems.push(`server error ${res.status()}: ${res.request().method()} ${res.url().replace(API, '')}`); });

console.log('• Signing in as the test admin…');
try {
  await page.goto(`${WEB}/login`);
  await page.locator('input[autocomplete="email"]').fill(EMAIL, { timeout: 30000 });
  await page.locator('input[type="password"]').fill(password);
  // The card title says "Sign In" too; the button is the last one
  await page.getByText('Sign In', { exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
} catch (err) {
  await page.screenshot({ path: path.join(shotsDir, 'sign-in-failed.png') }).catch(() => undefined);
  await browser.close();
  web.close();
  fail(`Signing in failed (${String(err?.message || err).split('\n')[0]}); see .browser-check/screens/sign-in-failed.png${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
}
problems = [];

const results = [];
for (const screen of screens) {
  const name = screen || 'home';
  process.stdout.write(`  /${screen} `);
  problems = [];
  await page.goto(`${WEB}/${screen}`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => problems.push('still loading after 15s'));
  await page.waitForTimeout(800);
  const file = `${name.replace(/\//g, '-')}.png`;
  await page.screenshot({ path: path.join(shotsDir, file), fullPage: true });
  const unique = [...new Set(problems)];
  results.push({ screen: `/${screen}`, file, problems: unique });
  console.log(unique.length ? `✗ ${unique.length} problem(s)` : '✓');
}

await browser.close();
web.close();
stopAll();

const bad = results.filter((r) => r.problems.length);
const report = [
  `# Browser check`,
  '',
  `${results.length} screens at phone size (412×915), signed in as a club admin on a local test copy.`,
  `${bad.length ? `${bad.length} with problems.` : 'No problems found.'} Screenshots: \`screens/\`.`,
  '',
  '| Screen | Screenshot | Problems |',
  '|---|---|---|',
  ...results.map((r) => `| ${r.screen} | screens/${r.file} | ${r.problems.length ? r.problems.join('<br>').replace(/\|/g, '\\|') : '✓'} |`),
  '',
].join('\n');
writeFileSync(path.join(out, 'report.md'), report);
console.log(`\n${bad.length ? `✗ ${bad.length} of ${results.length} screens had problems` : `✓ All ${results.length} screens loaded cleanly`}. Report: mobile/.browser-check/report.md`);
process.exit(bad.length ? 1 : 0);
