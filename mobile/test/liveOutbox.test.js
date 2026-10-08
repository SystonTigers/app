/* Match Centre send queue. Usage: node test/liveOutbox.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const o = require('../src/utils/liveOutbox.ts');

const tap = (id, type = 'goal') => ({ fixtureId: 'f1', event: { type, clientEventId: id, occurredAt: 1000 }, label: o.tapLabel(type) });
let q = [];
q = o.enqueue(q, tap('a'));
q = o.enqueue(q, tap('b', 'opp_goal'));
q = o.enqueue(q, tap('a')); // the same tap again isn't added twice; it moves to the end
assert.deepEqual(q.map((t) => t.event.clientEventId), ['b', 'a']);
q = o.dequeue(q, 'b');
assert.deepEqual(q.map((t) => t.event.clientEventId), ['a']);

assert.equal(o.afterFailure(undefined), 'retry'); // no signal
assert.equal(o.afterFailure(503), 'retry');
assert.equal(o.afterFailure(429), 'retry');
assert.equal(o.afterFailure(409), 'drop');
assert.equal(o.afterFailure(400), 'drop');

assert.equal(o.tapLabel('goal', 'Sam Smith'), 'Goal · Sam Smith');
assert.equal(o.tapLabel('full_time'), 'Full time');
assert.equal(o.waitingLine([]), null);
assert.match(o.waitingLine([tap('a')]), /^1 update waiting/);
assert.match(o.waitingLine([tap('a'), tap('b')]), /^2 updates waiting/);
console.log('liveOutbox tests passed');

// The match moves on straight away with what's queued
const base = { fixture: { id: 'f1', opponent: 'Rovers', date: '2026-10-11', time: '10:30', venue: null, competition: null, homeAway: 'home' },
  status: 'live', period: 1, ourScore: 1, theirScore: 0, kickedOffAt: 1, secondHalfAt: null, endedAt: null, halfLength: 40, minute: 20, events: [] };
const names = new Map([['p1', 'Sam Smith']]);
const queued = [
  { fixtureId: 'f1', event: { type: 'goal', clientEventId: 'g', occurredAt: 5000, playerId: 'p1' }, label: 'Goal · Sam Smith' },
  { fixtureId: 'f1', event: { type: 'half_time', clientEventId: 'h', occurredAt: 6000 }, label: 'Half time' },
  { fixtureId: 'other', event: { type: 'goal', clientEventId: 'x', occurredAt: 6000 }, label: 'Goal' },
];
const shown = o.withQueued(base, queued, names);
assert.equal(shown.ourScore, 2);
assert.equal(shown.status, 'half_time');
assert.deepEqual(shown.events.map((e) => [e.id, e.playerName]), [['h', null], ['g', 'Sam Smith']]);
assert.equal(base.ourScore, 1); // the real view isn't changed
assert.equal(o.withQueued(base, []), base);

// Kick-off with no signal: Match Centre can carry on
const started = o.queuedKickOff(base.fixture, [{ fixtureId: 'f1', event: { type: 'kick_off', clientEventId: 'k', occurredAt: 1000, halfLength: 30 }, label: 'Kick-off' }]);
assert.equal(started.status, 'live');
assert.equal(started.halfLength, 30);
assert.equal(started.kickedOffAt, 1000);
assert.equal(o.queuedKickOff(base.fixture, []), null);
console.log('liveOutbox overlay tests passed');
