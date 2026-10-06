/* Last Man Standing admin helpers. Usage: node test/lms.test.js */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const l = require('../src/utils/lms.ts');

assert.deepEqual(l.roundFixtures([{ home: ' Arsenal ', away: 'Chelsea' }, { home: '', away: '' }]), [{ home: 'Arsenal', away: 'Chelsea' }]);
assert.equal(l.roundFixtures([{ home: 'Arsenal', away: '' }]), 'Fill in both teams for each match (or clear the row).');
assert.equal(l.roundFixtures([{ home: 'Arsenal', away: 'Chelsea' }, { home: 'arsenal', away: 'Spurs' }]), 'arsenal is in more than one match.');
assert.equal(l.roundFixtures([]), 'Add at least one match.');

const now = new Date(2026, 9, 6, 12, 0).getTime();
assert.equal(l.picksClose('', '', now), null);
assert.equal(l.picksClose('10/10/2026', '15:00', now), new Date(2026, 9, 10, 15, 0).getTime());
assert.equal(l.picksClose('10/10/2026', '', now), new Date(2026, 9, 10, 23, 59).getTime());
assert.equal(l.picksClose('01/10/2026', '15:00', now), 'Picks need to close in the future.');
assert.equal(l.picksClose('10/10/2026', '25:00', now), 'Enter the time like 15:00.');
assert.equal(l.picksClose('soon', '', now), 'Enter the date like 31/10/2026.');

const fx = [{ id: 'a', home: 'A', away: 'B' }];
assert.deepEqual(l.roundResults(fx, { a: { home: '2', away: '0' } }), [{ id: 'a', homeScore: 2, awayScore: 0 }]);
assert.equal(l.roundResults(fx, { a: { home: '2', away: '' } }), 'Enter the score for A v B.');
assert.equal(l.roundResults(fx, {}), 'Enter the score for A v B.');

assert.deepEqual(l.teamsUsed({ teams_used: '["A","B"]' }), ['A', 'B']);
assert.deepEqual(l.teamsUsed({ teams_used: 'oops' }), []);
assert.equal(l.processedText({ survived: 3, eliminated: 2 }), 'Round done: 3 through, 2 out.');
assert.equal(l.processedText({ survived: 1, eliminated: 4, gameOver: true, winners: [{ name: 'Jo' }] }), 'Round done: 1 through, 4 out. Jo wins!');
console.log('lms tests passed');
