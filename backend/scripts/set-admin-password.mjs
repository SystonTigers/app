#!/usr/bin/env node
// Set (or reset) the Syston admin password without ever committing it.
//
// Usage (from backend/):
//   SYSTON_ADMIN_PASSWORD='...' node scripts/set-admin-password.mjs            # local D1
//   SYSTON_ADMIN_PASSWORD='...' node scripts/set-admin-password.mjs --remote   # production D1
//
// Windows PowerShell:
//   $env:SYSTON_ADMIN_PASSWORD='...'; node scripts/set-admin-password.mjs --remote
//
// Optional env: SYSTON_ADMIN_EMAIL (default systontowntigersfc@gmail.com)
//
// The password is hashed with bcrypt (same as the /auth login route) and only the
// hash is sent to D1. Nothing is written to disk or printed.

import { spawnSync } from 'node:child_process';
import bcrypt from 'bcryptjs';

const remote = process.argv.includes('--remote');
const email = (process.env.SYSTON_ADMIN_EMAIL || 'systontowntigersfc@gmail.com').trim().toLowerCase();
const password = process.env.SYSTON_ADMIN_PASSWORD || '';

if (password.length < 12) {
  console.error('✗ Set SYSTON_ADMIN_PASSWORD (min 12 characters) before running this script.');
  process.exit(1);
}
if (!/^[^@\s']+@[^@\s']+\.[^@\s']+$/.test(email)) {
  console.error('✗ SYSTON_ADMIN_EMAIL is not a valid email address.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
// bcrypt hashes only contain [./A-Za-z0-9$], so they're safe inside a SQL string literal.
const sql = `UPDATE auth_users SET password_hash = '${hash}', updated_at = unixepoch() WHERE lower(email) = '${email}' RETURNING id;`;

const args = ['wrangler', 'd1', 'execute', 'DB', '--json', '--command', sql];
if (remote) {
  args.push('--remote', '--env', 'production');
} else {
  args.push('--local');
}

console.log(`→ Updating password for ${email} (${remote ? 'production' : 'local'} D1)...`);
const result = spawnSync('npx', args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});
const out = result.stdout?.toString() || '';

if (result.status !== 0) {
  console.error('✗ wrangler d1 execute failed:');
  console.error(result.stderr?.toString() || out);
  process.exit(result.status || 1);
}
let changes = null;
try {
  // wrangler may print notices before the JSON payload; RETURNING gives one row per updated user
  const payload = JSON.parse(out.slice(out.indexOf('[')));
  const rows = payload?.[0]?.results;
  changes = Array.isArray(rows) ? rows.length : null;
} catch {
  // fall through: treated as unknown below
}
if (changes === null) {
  console.error('✗ Could not read the result from wrangler; check the output above.');
  console.error(out);
  process.exit(1);
}
if (changes === 0) {
  console.error(`✗ No user found with email ${email}. Run the seed first (npm run seed:syston).`);
  process.exit(1);
}
console.log('✓ Password updated. You can now log in with the new password.');
