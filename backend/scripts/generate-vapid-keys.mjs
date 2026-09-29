#!/usr/bin/env node
// Create the Web Push (VAPID) key pair that lets the Worker send match
// notifications to the installable web app, and store it on Cloudflare.
//
// Usage (from backend/):
//   node scripts/generate-vapid-keys.mjs --env production
//
// Run it ONCE per environment. A new pair means every phone has to turn
// notifications on again, so don't rotate it without a reason. The private
// key goes straight to Cloudflare; only the public key is printed.

import { spawnSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';

const envIdx = process.argv.indexOf('--env');
const env = envIdx > -1 ? process.argv[envIdx + 1] : '';
if (!env) {
  console.error('✗ Pass --env production (or --env preview).');
  process.exit(1);
}

const b64url = (bytes) => Buffer.from(bytes).toString('base64url');

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = b64url(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)));
const privateKey = (await webcrypto.subtle.exportKey('jwk', pair.privateKey)).d;

for (const [name, value] of [['VAPID_PUBLIC_KEY', publicKey], ['VAPID_PRIVATE_KEY', privateKey]]) {
  const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--env', env], {
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const out = `${result.stdout?.toString() || ''}${result.stderr?.toString() || ''}`;
  if (result.status !== 0 || !/Success/i.test(out)) {
    console.error(`✗ Setting ${name} failed:\n${out}`);
    process.exit(1);
  }
  console.log(`✓ ${name} set`);
}
console.log(`Public key (safe to share): ${publicKey}`);
