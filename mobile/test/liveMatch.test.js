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
