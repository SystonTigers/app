/* Tests for junior/adult team helpers (src/utils/teamType.ts) and players' availability wording. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
  module._compile(out.outputText, filename);
};

const { TEAM_TYPES, aboutWho, consentShown } = require('../src/utils/teamType.ts');
const { promptLine } = require('../src/utils/availability.ts');

assert.deepEqual(TEAM_TYPES.map((t) => t.value), ['junior', 'adult']);
assert.ok(TEAM_TYPES.every((t) => t.means.length >= 3));

// Adults: not answered counts as yes; a no stays a no
assert.equal(consentShown(null, true), true);
assert.equal(consentShown(false, true), false);
assert.equal(consentShown(null, false), null);
assert.equal(consentShown(true, false), true);

assert.equal(aboutWho(true, 'Sam Smith'), 'you');
assert.equal(aboutWho(false, 'Sam Smith'), 'Sam');
assert.equal(aboutWho(false), 'your child');

const item = (id, children) => ({ type: 'match', id, title: 'v Anstey', date: '2026-10-11', time: null, place: null, children });
const me = [{ playerId: 'p', name: 'Danny Clay', status: null, note: null }];
assert.equal(promptLine([item('a', me)], true), 'Can you make v Anstey on Sun 11 Oct?');
assert.equal(promptLine([item('a', me), item('b', me)], true), '2 answers needed from you. It only takes a tap each.');
assert.equal(promptLine([item('a', me)]), 'Can Danny make v Anstey on Sun 11 Oct?');

console.log('teamType tests passed');
