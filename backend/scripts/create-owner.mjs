#!/usr/bin/env node
// Create a platform owner login for the owner panel (website /owner), or reset
// its password, without the password ever being committed, printed or written
// to disk. Only the bcrypt hash is sent to D1.
//
// Usage (from backend/):
//   npm run owner:create          # local D1  (asks for the email and password)
//   npm run owner:create:prod     # live D1
//
// Non-interactive (CI/tests): set OWNER_EMAIL and OWNER_PASSWORD instead.

import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { askHidden, d1, EMAIL_RE } from './lib/cli.mjs';

const remote = process.argv.includes('--remote');
const where = remote ? 'LIVE' : 'local';

let email = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
let password = process.env.OWNER_PASSWORD || '';

if (!email || !password) {
  console.log(`Owner panel login (${where} database).`);
  const questions = [];
  if (!email) questions.push({ text: 'Your email: ', show: true });
  if (!password) questions.push('Password (min 12 characters, hidden): ', 'Type it again: ');
  const answers = await askHidden(questions);
  if (!email) email = answers.shift().trim().toLowerCase();
  if (!password) {
    const [first, again] = answers;
    if (first !== again) {
      console.error("✗ The passwords didn't match. Nothing was changed.");
      process.exit(1);
    }
    password = first;
  }
}

if (!EMAIL_RE.test(email)) {
  console.error('✗ That is not a valid email address. Nothing was changed.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('✗ The password must be at least 12 characters. Nothing was changed.');
  process.exit(1);
}

// bcrypt hashes only contain [./A-Za-z0-9$]; the email was validated above (no quotes)
const hash = bcrypt.hashSync(password, 12);
const rows = d1(`
  INSERT INTO platform_owners (id, email, password_hash, created_at)
  VALUES ('owner_${randomUUID()}', '${email}', '${hash}', ${Date.now()})
  ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash
  RETURNING id;`, remote);

if (!rows.length) {
  console.error('✗ The login was not saved. Nothing was changed.');
  process.exit(1);
}
console.log(`✓ Done. Sign in to the owner panel (website /owner) as ${email}.`);
console.log('  After a password reset, sessions already signed in end within 12 hours.');
