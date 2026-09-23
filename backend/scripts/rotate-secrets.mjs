#!/usr/bin/env node
// Rotate the Worker's shared secrets with fresh random values.
//
// Usage (from backend/):
//   node scripts/rotate-secrets.mjs --env production
//
// - JWT_SECRET       new value; everyone has to log in again
// - BACKEND_API_KEY  new value
// - GAS_HMAC_SECRET  new value
//
// Values are generated here and sent straight to Cloudflare; nothing is printed.
// Apps Script needs the same BACKEND_API_KEY / GAS_HMAC_SECRET, so those two are
// written to ../claude-ops/apps-script-secrets.txt (git-ignored) for you to copy
// into the Apps Script project's Script Properties. Delete the file afterwards.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const envIdx = process.argv.indexOf('--env');
const env = envIdx > -1 ? process.argv[envIdx + 1] : '';
if (!env) {
  console.error('✗ Pass --env production (or --env preview).');
  process.exit(1);
}

const names = ['JWT_SECRET', 'BACKEND_API_KEY', 'GAS_HMAC_SECRET'];
const values = Object.fromEntries(names.map((n) => [n, randomBytes(32).toString('hex')]));

for (const name of names) {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--env', env], {
    input: values[name],
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const out = `${result.stdout?.toString() || ''}${result.stderr?.toString() || ''}`;
  if (result.status !== 0 || !/Success/i.test(out)) {
    console.error(`✗ Setting ${name} failed:\n${out}`);
    process.exit(1);
  }
  console.log(`✓ ${name} rotated`);
}

const here = dirname(fileURLToPath(import.meta.url));
const opsDir = join(here, '..', '..', 'claude-ops');
mkdirSync(opsDir, { recursive: true });
const file = join(opsDir, 'apps-script-secrets.txt');
writeFileSync(
  file,
  [
    'Copy these into Apps Script: Project Settings > Script Properties.',
    'Then delete this file. Do not commit it or send it to anyone.',
    '',
    `BACKEND_API_KEY=${values.BACKEND_API_KEY}`,
    `GAS_HMAC_SECRET=${values.GAS_HMAC_SECRET}`,
    '',
  ].join('\r\n'),
);
console.log(`✓ Apps Script values saved to ${file}`);
