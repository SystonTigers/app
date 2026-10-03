/* Club Settings helpers. Usage: node test/clubSettings.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function load(file) {
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
  return mod.exports;
}
const { MATCH_POSTS, CLUB_POSTS, NAME_STYLES, SNIPPETS, toggleEvent, changedKinds, imageProblem, emailOutcome, MAX_BADGE_BYTES } = load('src/utils/clubSettings.ts');

// Every kind the server knows is listed once (shown in match order, like the website)
const server = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'src', 'services', 'social', 'content.ts'), 'utf8');
const kinds = (name) => JSON.parse(`[${server.match(new RegExp(`export const ${name} = \\[([^\\]]+)\\]`))[1].trim().replace(/,\s*$/, '')}]`);
assert.deepStrictEqual(MATCH_POSTS.map(([k]) => k).sort(), kinds('MATCH_KINDS').sort());
assert.deepStrictEqual(CLUB_POSTS.map(([k]) => k).sort(), kinds('SCHEDULED_KINDS').sort());
assert.deepStrictEqual(NAME_STYLES.map(([s]) => s).sort(), ['first', 'first_initial', 'full', 'initial_last', 'last']);
assert.deepStrictEqual(SNIPPETS.map((s) => s.kind), ['table', 'fixtures', 'results', 'team']);

// Toggling one box leaves the rest (and the original) alone
const all = Object.fromEntries([...MATCH_POSTS, ...CLUB_POSTS].map(([k]) => [k, { feed: true, social: false }]));
const next = toggleEvent(all, 'goal', 'social', true);
assert.deepStrictEqual(next.goal, { feed: true, social: true });
assert.deepStrictEqual(all.goal, { feed: true, social: false });
assert.strictEqual(next.red, all.red);
assert.deepStrictEqual(changedKinds(all, next), ['goal']);
assert.deepStrictEqual(changedKinds(all, toggleEvent(next, 'goal', 'social', false)), []);

// Pictures: PNG/JPG under 3 MB; unknown type or size is left to the server
assert.strictEqual(imageProblem({ mimeType: 'image/png', fileSize: 1000 }), null);
assert.strictEqual(imageProblem({ mimeType: 'image/jpeg', fileSize: MAX_BADGE_BYTES }), null);
assert.strictEqual(imageProblem({}), null);
assert.match(imageProblem({ mimeType: 'image/webp' }), /PNG or JPG/);
assert.match(imageProblem({ mimeType: 'image/heic', fileSize: 10 }), /PNG or JPG/);
assert.match(imageProblem({ mimeType: 'image/png', fileSize: MAX_BADGE_BYTES + 1 }), /under 3 MB/);

// Recent FA emails
assert.strictEqual(emailOutcome({ outcome: 'imported', added: 2, updated: null }), 'Read: 2 added, 0 updated');
assert.strictEqual(emailOutcome({ outcome: 'not_fa', added: null, updated: null }), 'Not from FA Full-Time (ignored)');
assert.strictEqual(emailOutcome({ outcome: 'something_new', added: null, updated: null }), 'something_new');

console.log('clubSettings.test.js: all passed');
