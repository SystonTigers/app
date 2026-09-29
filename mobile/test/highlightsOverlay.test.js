/*
 * Scoreboard and captions drawn on highlights videos, and clip timing nudges.
 * Usage: node test/highlightsOverlay.test.js
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

const { overlaySpans, scoreAt, captionAt, drawOverlay, drawTitleCard } = require('../src/services/highlightsOverlay.ts');
const { nudgeSide, MAX_CLIP_SIDE, clipsLength } = require('../src/utils/highlights.ts');

const moment = (tapAt, us, them, title, minute) => ({
  tapAt, title, detail: null, minute,
  scoreBefore: { us: us[0], them: them[0] }, scoreAfter: { us: us[1], them: them[1] },
});

// Two clips that overlap become one stretch holding both moments; a later one stays separate
const spans = overlaySpans([
  { start: 130, end: 156, moment: moment(150, [0, 1], [0, 0], 'Goal · Sam', 3) },
  { start: 150, end: 160, moment: moment(155, [1, 1], [0, 1], 'Rival FC goal', 3) },
  { start: 400, end: 420, moment: moment(415, [1, 1], [1, 1], 'Save · Jo', 8) },
]);
assert.equal(spans.length, 2);
assert.deepEqual([spans[0].start, spans[0].end, spans[0].moments.length], [130, 160, 2]);

// Score before the first goal, after it, after theirs
assert.deepEqual(scoreAt(spans[0], 140), { us: 0, them: 0, minute: 3 });
assert.deepEqual(scoreAt(spans[0], 151), { us: 1, them: 0, minute: 3 });
assert.deepEqual(scoreAt(spans[0], 158), { us: 1, them: 1, minute: 3 });
assert.deepEqual(scoreAt(spans[1], 401), { us: 1, them: 1, minute: 8 });

// Captions appear as each moment happens (just before the tap) and fit inside the clip
assert.equal(captionAt(spans[0], 140), null);
assert.equal(captionAt(spans[0], 148).title, 'Goal · Sam');
assert.equal(captionAt(spans[0], 153).title, 'Rival FC goal');
assert.equal(captionAt(spans[0], 156).title, 'Rival FC goal');
assert.equal(captionAt(spans[0], 159), null);
assert.equal(spans[1].moments[0].captionFrom, 413);
const short = overlaySpans([{ start: 100, end: 103, moment: moment(102, [0, 0], [0, 0], 'Chance', 1) }]);
assert.equal(short[0].moments[0].captionFrom, 100);

// Drawing doesn't throw with a stand-in canvas and stays inside the frame
const calls = [];
const ctx = new Proxy({ measureText: (t) => ({ width: t.length * 10 }) }, {
  get(target, key) {
    if (key in target) return target[key];
    return (...args) => calls.push([key, ...args]);
  },
  set() { return true; },
});
const match = { home: { name: 'Syston Tigers', color: '#FFD21F' }, away: { name: 'Rival FC', color: '#9AA3AB' }, usIsHome: true, final: { home: 2, away: 1 }, date: 'Sun 27 Sep', clubName: 'Syston Tigers' };
drawOverlay(ctx, 1920, 1080, match, spans[0], 151);
drawTitleCard(ctx, 1920, 1080, match);
const texts = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
assert.ok(texts.includes('1 - 0'), 'scoreboard shows 1 - 0 after our goal');
assert.ok(texts.includes('2 - 1'), 'title card shows the final score');
assert.ok(texts.includes('MATCH HIGHLIGHTS'));
for (const c of calls.filter((c) => c[0] === 'fillRect')) {
  assert.ok(c[1] >= 0 && c[2] >= 0 && c[1] + c[3] <= 1920 && c[2] + c[4] <= 1080, `rect inside frame: ${c.slice(1)}`);
}
// Away side: the score is shown home first
calls.length = 0;
drawOverlay(ctx, 1280, 720, { ...match, usIsHome: false }, spans[0], 151);
assert.ok(calls.some((c) => c[0] === 'fillText' && c[1] === '0 - 1'));

// Upright phone video: everything still inside the frame
calls.length = 0;
drawOverlay(ctx, 1080, 1920, match, spans[0], 151);
drawTitleCard(ctx, 1080, 1920, match);
for (const c of calls.filter((c) => c[0] === 'fillRect')) {
  assert.ok(c[1] >= 0 && c[1] + c[3] <= 1080 && c[2] + c[4] <= 1920, `upright rect inside frame: ${c.slice(1)}`);
}
const bar = calls.find((c) => c[0] === 'moveTo');
assert.ok(bar[1] < 1080, 'scoreboard starts inside the frame');

// Timing nudges stay between 0 and the limit
assert.equal(nudgeSide(20, 5), 25);
assert.equal(nudgeSide(3, -5), 0);
assert.equal(nudgeSide(0, -1), null);
assert.equal(nudgeSide(MAX_CLIP_SIDE, 1), null);

// Overlapping clips count once
assert.equal(clipsLength([{ start: 0, end: 30 }, { start: 20, end: 40 }, { start: 100, end: 110 }]), 50);
assert.equal(clipsLength([{ start: 0, end: 30 }, { start: 5, end: 10 }]), 30);

console.log('highlightsOverlay tests passed');
