#!/usr/bin/env node
// Create the club admin login, or reset its password, without the password
// ever being committed, printed or written to disk.
//
// Usage (from backend/):
//   node scripts/set-admin-password.mjs            # local D1  (asks for the password)
//   node scripts/set-admin-password.mjs --remote   # production D1
//
// Non-interactive (CI): set SYSTON_ADMIN_PASSWORD instead of typing it.
// Optional env:
//   SYSTON_ADMIN_EMAIL  (default systontowntigersfc@gmail.com)
//   SYSTON_TENANT_SLUG  (default syston-tigers) - club the admin belongs to
//
// The account gets the tenant_admin + owner roles. The password is hashed with
// bcrypt (what the login route checks) and only the hash is sent to D1.

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';

// Run wrangler's JS entry with node directly. Going through npx needs a shell on
// Windows, and the shell splits the SQL argument apart at every space.
const require = createRequire(import.meta.url);
const wranglerPkg = require.resolve('wrangler/package.json');
const wranglerBin = path.join(path.dirname(wranglerPkg), require(wranglerPkg).bin.wrangler);

const remote = process.argv.includes('--remote');
const email = (process.env.SYSTON_ADMIN_EMAIL || 'systontowntigersfc@gmail.com').trim().toLowerCase();
const slug = (process.env.SYSTON_TENANT_SLUG || 'syston-tigers').trim();

if (!/^[^@\s']+@[^@\s']+\.[^@\s']+$/.test(email)) {
  console.error('✗ SYSTON_ADMIN_EMAIL is not a valid email address.');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('✗ SYSTON_TENANT_SLUG may only contain a-z, 0-9 and dashes.');
  process.exit(1);
}

/** Ask questions without echoing what's typed (works with a terminal or piped input). */
async function askHidden(questions) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
  const write = rl._writeToOutput?.bind(rl);
  if (write) {
    rl._writeToOutput = () => {}; // never echo keystrokes
  }
  const lines = rl[Symbol.asyncIterator]();
  const answers = [];
  for (const q of questions) {
    process.stdout.write(q);
    const { value, done } = await lines.next();
    process.stdout.write('\n');
    answers.push(done ? '' : value);
  }
  rl.close();
  return answers;
}

function d1(sql) {
  const args = [wranglerBin, 'd1', 'execute', 'DB', '--json', '--command', sql.replace(/\s+/g, ' ').trim()];
  args.push(...(remote ? ['--remote', '--env', 'production'] : ['--local']));
  const result = spawnSync(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const out = result.stdout?.toString() || '';
  if (result.status !== 0) {
    console.error('✗ wrangler d1 execute failed:');
    console.error(result.stderr?.toString() || out);
    process.exit(result.status || 1);
  }
  try {
    // wrangler may print notices before the JSON payload
    return JSON.parse(out.slice(out.indexOf('[')))?.[0]?.results ?? [];
  } catch {
    console.error('✗ Could not read the result from wrangler:');
    console.error(out);
    process.exit(1);
  }
}

let password = process.env.SYSTON_ADMIN_PASSWORD || '';
if (!password) {
  console.log(`Setting the admin password for ${email} (${remote ? 'LIVE' : 'local'} database).`);
  const [first, again] = await askHidden(['New password (min 12 characters): ', 'Type it again: ']);
  password = first;
  if (password !== again) {
    console.error("✗ The passwords didn't match. Nothing was changed.");
    process.exit(1);
  }
}
if (password.length < 12) {
  console.error('✗ The password must be at least 12 characters. Nothing was changed.');
  process.exit(1);
}

const tenants = d1(`SELECT id FROM tenants WHERE slug = '${slug}' LIMIT 1;`);
if (!tenants.length) {
  console.error(`✗ No club with slug "${slug}" in the ${remote ? 'live' : 'local'} database.`);
  process.exit(1);
}
const tenantId = tenants[0].id;

// bcrypt hashes only contain [./A-Za-z0-9$]; ids/emails were validated above
const hash = bcrypt.hashSync(password, 10);
const now = Date.now();
const roles = JSON.stringify(['tenant_admin', 'owner']);

const rows = d1(`
  INSERT INTO auth_users (id, tenant_id, email, password_hash, roles, profile, created_at, updated_at)
  VALUES ('user_${randomUUID()}', '${tenantId}', '${email}', '${hash}', '${roles}', '{"name":"Club Admin"}', ${now}, ${now})
  ON CONFLICT(tenant_id, email) DO UPDATE SET
    password_hash = excluded.password_hash,
    roles = excluded.roles,
    updated_at = excluded.updated_at
  RETURNING id;`);

if (!rows.length) {
  console.error('✗ The account was not saved. Nothing was changed.');
  process.exit(1);
}
console.log(`✓ Done. Log in as ${email} with the password you just typed.`);
