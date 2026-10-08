/* Availability helpers. Usage: node test/availability.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const a = require('../src/utils/availability.ts');

const item = (over = {}) => ({ type: 'match', id: 'm1', title: 'v Anstey Nomads', date: '2026-10-11', time: '10:30', place: null, children: [], ...over });

assert.equal(a.dayLabel('2026-10-11'), 'Sun 11 Oct');
assert.equal(a.whenLabel(item(), '2026-10-11'), 'Today, 10:30');
assert.equal(a.whenLabel(item(), '2026-10-10'), 'Tomorrow, 10:30');
assert.equal(a.whenLabel(item({ time: null }), '2026-10-01'), 'Sun 11 Oct');
assert.equal(a.whenLabel(item({ date: '2026-11-01' }), '2026-10-31'), 'Tomorrow, 10:30');
assert.equal(a.ukToday(new Date('2026-10-10T23:30:00Z')), '2026-10-11');

assert.equal(a.answerLabel('yes'), 'Available');
assert.equal(a.answerLabel(null), 'Not answered');

// The home prompt
const ava = { playerId: 'p1', name: 'Ava Smith', status: null, note: null };
const ben = { playerId: 'p2', name: 'Ben Smith', status: null, note: null };
assert.equal(a.promptLine([item({ children: [{ ...ava, status: 'yes' }] })]), null);
assert.equal(a.promptLine([item({ children: [ava] })]), 'Can Ava make v Anstey Nomads on Sun 11 Oct?');
assert.equal(a.promptLine([item({ type: 'training', title: 'Training: Passing', children: [ava] })]), 'Can Ava make training on Sun 11 Oct?');
assert.equal(a.promptLine([item({ children: [ava, ben] }), item({ id: 'm2', children: [ava] })]), '3 answers needed for Ava and Ben. It only takes a tap each.');
assert.equal(a.unanswered([item({ children: [ava, { ...ben, status: 'no' }] })]).length, 1);

// Staff
assert.equal(a.countsLine({ yes: 9, no: 1, maybe: 0, waiting: 4 }), "9 available · 1 can't · 4 not answered");
assert.equal(a.countsLine({ yes: 0, no: 0, maybe: 0, waiting: 0 }), 'No players in the squad yet');
const groups = a.groupSquad([
  { ...ava, status: 'no', number: 4, byStaff: false, linkedFamilies: 1 },
  { ...ben, status: null, number: 7, byStaff: false, linkedFamilies: 0 },
  { playerId: 'p3', name: 'Cal', status: 'yes', note: null, number: 9, byStaff: true, linkedFamilies: 1 },
]);
assert.deepEqual(groups.map((g) => g.title), ['Available', "Can't make it", 'Not answered']);
assert.equal(a.lineupHint('maybe'), 'maybe');
assert.equal(a.lineupHint(undefined), '');
assert.equal(a.nameList(['Ava', 'Ben', 'Cal']), 'Ava, Ben and Cal');

console.log('availability tests passed');
