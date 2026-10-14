/*
 * Match Centre pickers: scorer, assist and going off offer the players on the
 * pitch, coming on offers the bench, and "Show full squad" offers everyone.
 * Usage: node test/matchPickers.test.js
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

const { pickerPlayers, pickerHeading, pickerToggleLabel } = require('../src/utils/matchPickers.ts');

// 11 starters (s1..s11), 4 subs (b1..b4) and one squad player left out of the team (x1)
const starters = Array.from({ length: 11 }, (_, i) => `s${i + 1}`);
const subs = ['b1', 'b2', 'b3', 'b4'];
const squad = [...starters, ...subs, 'x1'].map((id, i) => ({ id, name: `Player ${id}`, number: i + 1 }));
const lineup = { starters, subs };
const MIN = 60000;
let at = 1000;
const ev = (type, playerId = null, player2Id = null, extra = {}) => ({
  id: `e${at}`, type, minute: 1, playerId, playerName: null, player2Id, player2Name: null, text: null, createdAt: at++, ...extra,
});
const match = (events) => ({ events, halfLength: 40, endedAt: null });
const ids = (list) => list.players.map((p) => p.id);

// Kick-off: the eleven are on the pitch, the four on the bench
const start = match([ev('kick_off')]);
const scorer = pickerPlayers('goal', squad, start, lineup, at, false);
assert.deepEqual(ids(scorer), starters);
assert.equal(scorer.group, 'pitch');
assert.equal(scorer.hiddenCount, 5);
assert.equal(pickerHeading(scorer, false), 'On the pitch · 11');
assert.equal(pickerToggleLabel('pitch', false), 'Show full squad');
assert.equal(pickerToggleLabel('pitch', true), 'Show only the pitch');
assert.equal(pickerToggleLabel('bench', true), 'Show only the bench');

// The assist leaves out the scorer; the bench shows the subs
assert.deepEqual(ids(pickerPlayers('assist', squad, start, lineup, at, false, 's9')), starters.filter((id) => id !== 's9'));
assert.deepEqual(ids(pickerPlayers('sub_off', squad, start, lineup, at, false)), starters);
const comingOn = pickerPlayers('sub_on', squad, start, lineup, at, false, 's4');
assert.deepEqual(ids(comingOn), subs);
assert.equal(pickerHeading(comingOn, false), 'On the bench · 4');

// Full squad: the usual group first, then everyone else, labelled with where they are
const full = pickerPlayers('goal', squad, start, lineup, at, true);
assert.equal(full.players.length, 16);
assert.deepEqual(ids(full).slice(0, 11), starters);
assert.equal(full.players[0].where, null);
assert.equal(full.players.find((p) => p.id === 'b1').where, 'On the bench');
assert.equal(full.players.find((p) => p.id === 'x1').where, 'Not in the team');
assert.equal(pickerHeading(full, true), 'Full squad · 16');
assert.equal(full.inGroup('s1'), true);
assert.equal(full.inGroup('b1'), false);
// The default list has no labels
assert.equal(scorer.players[0].where, null);

// A sub moves the players: b1 on for s4, so b1 can score and s4 can come back on
const afterSub = match([ev('kick_off'), ev('sub', 'b1', 's4')]);
const scorers = ids(pickerPlayers('goal', squad, afterSub, lineup, at, false));
assert.ok(scorers.includes('b1'));
assert.ok(!scorers.includes('s4'));
assert.equal(scorers.length, 11);
assert.deepEqual(ids(pickerPlayers('sub_on', squad, afterSub, lineup, at, false)).sort(), ['b2', 'b3', 'b4', 's4']);

// Sent off: gone from every list, the full squad too
const sentOff = match([ev('kick_off'), ev('red', 's2')]);
assert.ok(!ids(pickerPlayers('goal', squad, sentOff, lineup, at, false)).includes('s2'));
assert.ok(!ids(pickerPlayers('goal', squad, sentOff, lineup, at, true)).includes('s2'));
assert.ok(!ids(pickerPlayers('yellow', squad, sentOff, lineup, at, false)).includes('s2'));

// Sin bin: not on the pitch for scoring until it's over; the full squad still has them
const kickOffAt = at;
const binned = match([ev('kick_off', null, null, { createdAt: kickOffAt }), ev('sin_bin', 's3', null, { createdAt: kickOffAt + MIN, text: '8' })]);
assert.ok(!ids(pickerPlayers('goal', squad, binned, lineup, kickOffAt + 2 * MIN, false)).includes('s3'));
const binnedFull = pickerPlayers('goal', squad, binned, lineup, kickOffAt + 2 * MIN, true);
assert.equal(binnedFull.players.find((p) => p.id === 's3').where, 'On the pitch');
assert.ok(ids(pickerPlayers('goal', squad, binned, lineup, kickOffAt + 20 * MIN, false)).includes('s3'));
assert.ok(!ids(pickerPlayers('sin_bin', squad, binned, lineup, kickOffAt + 2 * MIN, false)).includes('s3'));

// Cards keep the whole squad (players can be booked on the bench), with no toggle
const card = pickerPlayers('yellow', squad, start, lineup, at, false);
assert.equal(card.players.length, 16);
assert.equal(card.group, null);
assert.equal(card.hiddenCount, 0);
assert.equal(pickerHeading(card, false), null);

// No line-up (or not loaded yet): every picker shows the squad, with no toggle
const noLineup = pickerPlayers('goal', squad, start, null, at, false);
assert.equal(noLineup.players.length, 16);
assert.equal(noLineup.group, null);
assert.equal(noLineup.inGroup('x1'), true);
assert.equal(pickerPlayers('sub_on', squad, start, { starters: [], subs: [] }, at, false).group, null);

console.log('matchPickers tests passed');
