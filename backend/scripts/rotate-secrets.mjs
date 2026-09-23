#!/usr/bin/env node
// Rotate the Worker's JWT signing secret with a fresh random value.
//
// Usage (from backend/):
//   node scripts/rotate-secrets.mjs --env production
//
// Everyone has to log in again afterwards. The value is generated here and sent
// straight to Cloudflare; nothing is printed or written to disk.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const envIdx = process.argv.indexOf('--env');
const env = envIdx > -1 ? process.argv[envIdx + 1] : '';
if (!env) {
  console.error('✗ Pass --env production (or --env preview).');
  process.exit(1);
}

const names = ['JWT_SECRET'];
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
