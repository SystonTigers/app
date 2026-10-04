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

const { formatClock, parseClock, clipEmbedUrl, readPlayerMessage, nextClip, matchDate } = require('../src/utils/highlights.ts');

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

console.log('highlights tests passed');

// Uploaded club videos
{
  const { readClubVideos, clubVideoLine } = require('../src/utils/highlights.ts');
  const vids = readClubVideos([
    { id: 'a', title: 'Cup final', type: 'full-match', video_url: 'https://x/v.mp4', uploaded_at: '2026-10-03 18:00:00' },
    { id: 'b', title: '', type: 'goal', youtube_url: 'https://youtu.be/q' },
    { id: 'c', title: 'Nothing to play', video_url: '' },
    null,
  ]);
  assert.deepEqual(vids.map((v) => v.id), ['a', 'b']);
  assert.equal(vids[1].title, 'Club video');
  assert.equal(clubVideoLine(vids[0]), 'Full match · 3 Oct 2026');
  assert.equal(clubVideoLine(vids[1]), 'Goal');
  assert.deepEqual(readClubVideos({}), []);
  console.log('club video tests passed');
}
