/*
 * People & Roles helpers: filtering, sorting, last seen.
 * Usage: node test/members.test.js
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { filterMembers, sortMembers, lastSeen, signedUpLabel, initialsOf, linkedLabel, ROLE_INFO, ASSIGNABLE_ROLES } = require('../src/utils/members.ts');

const people = [
  { name: 'Pat Parent', email: 'pat@example.com', role: 'parent' },
  { name: 'Cal Coach', email: 'cal@example.com', role: 'coach' },
  { name: 'Olly Owner', email: 'olly@example.com', role: 'owner' },
  { name: 'Pip Player', email: 'pip@example.com', role: 'player' },
  { name: 'Ann Admin', email: 'ann@example.com', role: 'admin' },
];

assert.deepEqual(filterMembers(people, 'staff', '').map((p) => p.name).sort(), ['Ann Admin', 'Cal Coach', 'Olly Owner']);
assert.deepEqual(filterMembers(people, 'parent', '').map((p) => p.name), ['Pat Parent']);
assert.deepEqual(filterMembers(people, 'all', 'PIP@').map((p) => p.name), ['Pip Player']);
assert.deepEqual(filterMembers(people, 'staff', 'pat'), []);
assert.deepEqual(sortMembers(people).map((p) => p.role), ['owner', 'admin', 'coach', 'player', 'parent']);
assert.ok(!ASSIGNABLE_ROLES.includes('owner'));

const now = Date.UTC(2026, 8, 30, 12);
assert.equal(lastSeen(null, now), 'Never signed in');
assert.equal(lastSeen(now - 3600_000, now), 'Signed in today');
assert.equal(lastSeen(now - 86400_000 - 1000, now), 'Signed in yesterday');
assert.equal(lastSeen(now - 5 * 86400_000, now), 'Signed in 5 days ago');
assert.equal(signedUpLabel(now - 3600_000, now), 'Signed up today');
assert.equal(signedUpLabel(now - 5 * 86400_000, now), 'Signed up 5 days ago');
assert.equal(signedUpLabel(null, now), 'Just signed up');
assert.equal(initialsOf('Jo Manager'), 'JM');
assert.equal(initialsOf(''), '?');

assert.equal(linkedLabel('player', 1), 'Linked to their player page');
assert.equal(linkedLabel('parent', 1), '1 child linked');
assert.equal(linkedLabel('parent', 2), '2 children linked');
assert.equal(linkedLabel('parent', 0), '');
assert.equal(ROLE_INFO.owner.label, 'Owner');

console.log('members tests passed');
