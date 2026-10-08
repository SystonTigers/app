/*
 * Match highlights helpers.
 * Usage: node test/highlights.test.js
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

const { formatClock, parseClock, clipEmbedUrl, readPlayerMessage, nextClip, matchDate, partsToLineUp, partName, capitalise, waitingLine } = require('../src/utils/highlights.ts');

assert.equal(formatClock(754), '12:34');
assert.equal(formatClock(3723), '1:02:03');
assert.equal(formatClock(-4), '0:00');
assert.equal(parseClock('12:34'), 754);
assert.equal(parseClock('1:02:03'), 3723);
assert.equal(parseClock(' 95 '), 95);
assert.equal(parseClock('12:75'), null);
assert.equal(parseClock('twelve'), null);

const url = clipEmbedUrl('abcdefghijk', { start: 120.4, end: 146.2 }, 'https://app.example');
assert.match(url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?/);
assert.match(url, /start=120/);
assert.match(url, /end=147/);
assert.match(url, /enablejsapi=1/);
assert.match(url, /origin=https%3A%2F%2Fapp\.example/);
assert.doesNotMatch(clipEmbedUrl('abcdefghijk', null), /start=/);

assert.deepEqual(readPlayerMessage('{"event":"infoDelivery","info":{"playerState":0}}'), { ended: true });
assert.deepEqual(readPlayerMessage({ event: 'infoDelivery', info: { currentTime: 61.5 } }), { currentTime: 61.5 });
assert.equal(readPlayerMessage('{"event":"onReady"}'), null);
assert.equal(readPlayerMessage('not json'), null);

const m = (hidden) => ({ id: 'x', type: 'goal', minute: 1, title: '', detail: null, start: 0, end: 5, hidden });
assert.equal(nextClip([m(false), m(true), m(false)], 0), 2);
assert.equal(nextClip([m(false), m(true)], 0), -1);

assert.equal(matchDate('2026-09-27'), 'Sun 27 Sept'.replace('Sept', new Date(Date.UTC(2026, 8, 27)).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })));
assert.equal(matchDate('rubbish'), 'rubbish');

// A restarted stream: part 2 is a pasted link nobody has lined up yet
const parts = [
  { videoId: 'a', part: 1, lineUp: 'automatic', lineUpWith: { eventId: 'ko', label: 'kick-off' } },
  { videoId: 'b', part: 2, lineUp: null, lineUpWith: { eventId: 'g2', label: "the goal by Sam (46')" } },
  { videoId: 'c', part: 3, lineUp: null, lineUpWith: null },
];
assert.deepEqual(partsToLineUp({ parts }).map((p) => p.videoId), ['b']);
assert.deepEqual(partsToLineUp({}), []);
assert.equal(partName(parts[1], 3), 'part 2 of the video');
assert.equal(partName(parts[0], 1), 'the video');
assert.equal(capitalise('kick-off'), 'Kick-off');
assert.equal(waitingLine({ momentsWaiting: 0, canEdit: true }), null);
assert.equal(waitingLine({ canEdit: false }), null);
assert.equal(waitingLine({ momentsWaiting: 1, canEdit: true }), '1 more clip will appear once the rest of the video is lined up.');
assert.equal(waitingLine({ momentsWaiting: 3, canEdit: false }), '3 more clips will appear once the manager lines up the rest of the video.');

console.log('highlights tests passed');
