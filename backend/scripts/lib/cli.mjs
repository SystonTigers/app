// Shared helpers for the account scripts (set-admin-password, create-owner):
// ask for passwords without echoing them, and run SQL on D1 through wrangler.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';

// Run wrangler's JS entry with node directly. Going through npx needs a shell on
// Windows, and the shell splits the SQL argument apart at every space.
const require = createRequire(import.meta.url);
const wranglerPkg = require.resolve('wrangler/package.json');
const wranglerBin = path.join(path.dirname(wranglerPkg), require(wranglerPkg).bin.wrangler);

/**
 * Ask questions without echoing what's typed (works with a terminal or piped
 * input). Pass `{ text, show: true }` for a question whose answer may be shown.
 */
export async function askHidden(questions) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
  const echo = rl._writeToOutput?.bind(rl);
  let hidden = true;
  if (echo) {
    rl._writeToOutput = (text) => { if (!hidden) echo(text); }; // never echo hidden keystrokes
  }
  const lines = rl[Symbol.asyncIterator]();
  const answers = [];
  for (const q of questions) {
    const { text, show } = typeof q === 'string' ? { text: q, show: false } : q;
    hidden = !show;
    process.stdout.write(text);
    const { value, done } = await lines.next();
    if (hidden) process.stdout.write('\n');
    answers.push(done ? '' : value);
  }
  rl.close();
  return answers;
}

/** Run one SQL statement on the local or live D1 database and return its rows. */
export function d1(sql, remote) {
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

export const EMAIL_RE = /^[^@\s']+@[^@\s']+\.[^@\s']+$/;
