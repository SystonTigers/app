/*
 * Live match display helpers.
 * Usage: node test/liveMatch.test.js
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

const { currentMinute, statusLabel, scoreline, describeEvent } = require('../src/utils/liveMatch.ts');
const MIN = 60000;

const firstHalf = { status: 'live', period: 1, kickedOffAt: 0, secondHalfAt: null, halfLength: 30 };
assert.equal(currentMinute(firstHalf, 0), 1);
assert.equal(currentMinute(firstHalf, 12 * MIN + 5000), 13);
assert.equal(statusLabel(firstHalf, 12 * MIN), "13'");

const secondHalf = { status: 'live', period: 2, kickedOffAt: 0, secondHalfAt: 40 * MIN, halfLength: 30 };
assert.equal(currentMinute(secondHalf, 45 * MIN), 36);
assert.equal(statusLabel({ ...secondHalf, status: 'half_time' }, 0), 'Half time');

const match = { fixture: { opponent: 'Rovers', homeAway: 'away' }, ourScore: 2, theirScore: 1 };
assert.deepEqual(scoreline(match, 'Syston'), { home: 'Rovers', away: 'Syston', homeScore: 1, awayScore: 2 });

assert.equal(describeEvent({ type: 'goal', playerName: 'Sam Striker', player2Name: 'Will Winger' }, 'Rovers'), 'GOAL! Sam Striker (assist Will Winger)');
assert.equal(describeEvent({ type: 'opp_goal', text: null }, 'Rovers'), 'Rovers score');
assert.equal(describeEvent({ type: 'sub', playerName: 'Sid', player2Name: 'Will' }, 'Rovers'), 'Sub: Sid on for Will');

console.log('liveMatch tests passed');

const { canUndo } = require('../src/utils/liveMatch.ts');
const k = { id: 'k', type: 'kick_off' }, g = { id: 'g', type: 'goal' }, ht = { id: 'h', type: 'half_time' }, ft = { id: 'f', type: 'full_time' };
assert.equal(canUndo([g, k], k), false);
assert.equal(canUndo([g, k], g), true);
assert.equal(canUndo([ht, g, k], ht), true);
assert.equal(canUndo([ft, g, k], g), false);
assert.equal(canUndo([ft, g, k], ft), true);
console.log('canUndo tests passed');

const { postStatusText } = require('../src/utils/liveMatch.ts');
const basePost = { targets: ['feed', 'facebook', 'instagram'], results: {}, postAfter: 60000 };
assert.equal(postStatusText({ ...basePost, status: 'pending' }, 18000), 'Posting to club app, Facebook, Instagram in 42s. Undo stops it.');
assert.equal(postStatusText({ ...basePost, status: 'done', results: { feed: { ok: true }, facebook: { ok: true }, instagram: { ok: true, skipped: true, error: "Instagram isn't connected." } } }, 0),
  "Posted to club app, Facebook. Not posted: Instagram (Instagram isn't connected.)");
assert.equal(postStatusText({ ...basePost, status: 'failed', results: { feed: { ok: true }, facebook: { ok: false, error: 'Reconnect Facebook and Instagram in Settings.' } } }, 0),
  "Couldn't post. Facebook: Reconnect Facebook and Instagram in Settings.");
console.log('postStatusText tests passed');

// Two-column timeline: each update under its team
const { eventSide, describeEventOnSide } = require('../src/utils/liveMatch.ts');
const ev = (type, extra = {}) => ({ id: type, type, minute: 10, playerId: null, playerName: 'Sam', player2Id: null, player2Name: null, text: null, createdAt: 0, ...extra });
assert.equal(eventSide(ev('goal')), 'us');
assert.equal(eventSide(ev('yellow')), 'us');
assert.equal(eventSide(ev('save')), 'us');
assert.equal(eventSide(ev('opp_goal')), 'them');
assert.equal(eventSide(ev('opp_yellow')), 'them');
assert.equal(eventSide(ev('opp_red')), 'them');
assert.equal(describeEventOnSide(ev('opp_red', { text: 'No. 4' }), 'Rival FC'), 'Red card No. 4');
assert.equal(describeEvent(ev('opp_yellow'), 'Rival FC'), 'Yellow card: Rival FC');
assert.equal(eventSide(ev('half_time')), 'middle');
assert.equal(eventSide(ev('note')), 'middle');
assert.equal(describeEventOnSide(ev('opp_goal'), 'Rival FC'), 'GOAL!');
assert.equal(describeEventOnSide(ev('opp_goal', { text: 'penalty' }), 'Rival FC'), 'GOAL! penalty');
assert.equal(describeEventOnSide(ev('goal'), 'Rival FC'), 'GOAL! Sam');
console.log('eventSide tests passed');

// Clock with added time, second yellows, sin bins
const { clockLabel, secondYellowIds, sentOffIds, sinBinMinutes, activeSinBins, countdown } = require('../src/utils/liveMatch.ts');
assert.equal(clockLabel(firstHalf, 29 * MIN), "30'");
assert.equal(clockLabel(firstHalf, 31 * MIN), "30+2'");
assert.equal(clockLabel(firstHalf, 60 * MIN), "30+'");
assert.equal(clockLabel(secondHalf, 72 * MIN), "60+3'");
assert.equal(statusLabel({ ...firstHalf, stale: true }, 0), 'Awaiting full time');

const cards = [
  ev('yellow', { id: 'y1', playerId: 'p1', createdAt: 1 }),
  ev('yellow', { id: 'y2', playerId: 'p2', createdAt: 2 }),
  ev('yellow', { id: 'y3', playerId: 'p1', createdAt: 3 }),
  ev('red', { id: 'r1', playerId: 'p3', createdAt: 4 }),
].reverse();
assert.deepEqual([...secondYellowIds(cards)], ['y3']);
assert.deepEqual([...sentOffIds(cards)].sort(), ['p1', 'p3']);
assert.equal(describeEvent(cards[1], 'Rovers', true), 'Second yellow, sent off: Sam');
assert.equal(describeEvent(ev('sin_bin', { text: '6' }), 'Rovers'), 'Sin bin: Sam (6 min)');
assert.equal(eventSide(ev('sin_bin')), 'us');

assert.equal(sinBinMinutes(30), 6);
assert.equal(sinBinMinutes(5), 2);
assert.equal(countdown(65_000), '1:05');
assert.equal(countdown(1), '0:01');

// 6-minute sin bin at 25'; half time at 30' pauses it; second half at 40' (wall clock)
const binMatch = {
  halfLength: 30,
  endedAt: null,
  events: [
    ev('half_time', { createdAt: 30 * MIN }),
    ev('sin_bin', { id: 'b1', playerId: 'p2', text: '6', createdAt: 25 * MIN }),
    ev('kick_off', { createdAt: 0 }),
  ],
};
assert.equal(activeSinBins(binMatch, 27 * MIN)[0].remainingMs, 4 * MIN);
assert.equal(activeSinBins(binMatch, 35 * MIN)[0].remainingMs, 1 * MIN, 'paused at half time');
const restarted = { ...binMatch, events: [ev('second_half', { createdAt: 40 * MIN }), ...binMatch.events] };
assert.equal(activeSinBins(restarted, 40 * MIN + 30_000)[0].remainingMs, 30_000);
assert.equal(activeSinBins(restarted, 41 * MIN).length, 0, 'back on');
assert.equal(activeSinBins({ ...binMatch, endedAt: 26 * MIN }, 27 * MIN).length, 0, 'nothing after full time');
console.log('clock, second yellow and sin bin tests passed');
