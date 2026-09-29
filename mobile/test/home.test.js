/*
 * Home screen helpers: initials, countdown, ordinals, greeting.
 * Usage: node test/home.test.js
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

const { initials, countdownLabel, ordinal, greeting } = require('../src/components/home/homeUtils.ts');

assert.equal(initials('Riverside Rovers'), 'RR');
assert.equal(initials('Syston Tigers U16'), 'ST');
assert.equal(initials('Coalville Town Ravens U18 Ravens'), 'CT');
assert.equal(initials('AFC Rushden'), 'R');
assert.equal(initials(''), '?');

const now = new Date('2026-10-01T11:00:00Z'); // Thu 1 Oct, UK
assert.equal(countdownLabel('2026-10-01', now), 'TODAY');
assert.equal(countdownLabel('2026-10-02', now), 'TOMORROW');
assert.equal(countdownLabel('2026-10-04', now), 'IN 3 DAYS');
assert.equal(countdownLabel('2026-10-10', now), 'SAT 10 OCT');
// Just after midnight UK (still the 30th in UTC): tomorrow is the 2nd
assert.equal(countdownLabel('2026-10-02', new Date('2026-09-30T23:30:00Z')), 'TOMORROW');

assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal), ['1ST', '2ND', '3RD', '4TH', '11TH', '12TH', '13TH', '21ST', '22ND', '23RD', '101ST']);
assert.equal(greeting(new Date('2026-10-01T07:00:00Z')), 'Good morning');
assert.equal(greeting(new Date('2026-10-01T13:00:00Z')), 'Good afternoon');
assert.equal(greeting(new Date('2026-10-01T19:00:00Z')), 'Good evening');
console.log('home tests passed');

// Match Centre phase bar
const { nextPhase, phasesDone } = require('../src/components/matchCentre/phase.ts');
assert.equal(nextPhase(null, null), 'kick_off');
assert.equal(nextPhase('scheduled', null), 'kick_off');
assert.equal(nextPhase('live', 1), 'half_time');
assert.equal(nextPhase('half_time', 1), 'second_half');
assert.equal(nextPhase('live', 2), 'full_time');
assert.equal(nextPhase('full_time', 2), null);
assert.deepEqual(['kick_off', 'half_time', 'second_half', 'full_time', null].map(phasesDone), [0, 1, 2, 3, 4]);
console.log('phase tests passed');
