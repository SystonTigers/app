/* Match report helpers. Usage: node test/matchReport.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const r = require('../src/utils/matchReport.ts');

const loaded = r.readReport([
  { id: 'a', player_id: 'p1', event_type: 'goal', minute: 10 },
  { id: 'b', player_id: 'p2', event_type: 'appearance', minute: null },
  { id: 'c', player_id: 'p3', event_type: 'sub_off', minute: 60 },
  { id: 'd', player_id: 'p4', event_type: 'sub_on', minute: 60 },
  { id: 'live-x', player_id: 'p1', event_type: 'sin_bin', minute: 30 },
]);
assert.deepEqual(loaded.starters, ['p1', 'p2', 'p3']);
assert.deepEqual(loaded.subs, ['p4']);
assert.equal(loaded.events.length, 3);
assert.equal(loaded.skipped, 1);
assert.equal(loaded.fromMatchCentre, true);
assert.equal(r.readReport([]).fromMatchCentre, false);

assert.equal(r.readMinute(''), undefined);
assert.equal(r.readMinute('45'), 45);
assert.equal(r.readMinute('200'), 150);
assert.equal(r.readMinute('x'), undefined);

let ev = r.addEvent([], 'goal', 'p1', 5);
ev = r.addEvent(ev, 'sub_on', 'p4', 60, 'p3');
assert.deepEqual(ev.map((e) => e.eventType), ['goal', 'sub_off', 'sub_on']);
assert.equal(r.addEvent(ev, 'sub_on', 'p4', 60).length, 3);
assert.equal(r.addEvent(ev, 'sub_on', 'p4', 60, 'p4').length, 3);
assert.deepEqual(r.timeline([{ playerId: 'a', eventType: 'goal' }, { playerId: 'b', eventType: 'goal', minute: 3 }]).map((x) => x.index), [1, 0]);

let l = r.toggleLineup([], [], 'p1', 'starter');
assert.deepEqual(l, { starters: ['p1'], subs: [] });
l = r.toggleLineup(l.starters, l.subs, 'p1', 'sub');
assert.deepEqual(l, { starters: [], subs: ['p1'] });
const eleven = Array.from({ length: 11 }, (_, i) => `s${i}`);
assert.equal(r.toggleLineup(eleven, [], 'x', 'starter').starters.length, 11);

assert.equal(r.goalsWarning([{ playerId: 'a', eventType: 'goal' }, { playerId: 'a', eventType: 'goal' }], 1), "You've added 2 goals but the score says 1.");
assert.equal(r.goalsWarning([], 3), '');
console.log('match report tests passed');
