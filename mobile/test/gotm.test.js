/*
 * Goal of the Month helpers.
 * Usage: node test/gotm.test.js
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

const g = require('../src/utils/gotm.ts');

const data = g.readGotm({
  vote: {
    id: 'v1', label: 'September 2026', status: 'open', myVote: null, winners: [],
    candidates: [
      { id: 'c1', playerId: 'p1', playerName: 'Pat Player', opponent: 'Page Rovers', date: '2026-09-20', minute: 23, description: 'Volley', clip: null, videoUrl: 'https://youtu.be/x', votes: null },
      { id: 'c2', playerId: 'p2', playerName: 'Sam Smith', opponent: null, date: null, minute: null, clip: { id: 'k', videoId: 'abc' }, votes: null },
      { nope: true },
    ],
  },
  past: [{ id: 'v0', label: 'August 2026', status: 'closed', winners: ['a', 'b'], candidates: [
    { id: 'a', playerName: 'Alex Able', votes: 4 }, { id: 'b', playerName: 'Jo Bloggs', votes: 4 }, { id: 'c', playerName: 'Lee Low', votes: 1 },
  ] }, 'junk'],
});
assert.equal(data.vote.candidates.length, 2, 'bad rows dropped');
assert.equal(data.vote.candidates[1].description, null);
assert.equal(data.past.length, 1);
assert.deepEqual(g.readGotm(null), { vote: null, past: [] });
assert.deepEqual(g.readGotm({ vote: 'x', past: 'y' }), { vote: null, past: [] });

assert.match(g.goalLine(data.vote.candidates[0]), /^v Page Rovers · 23' · Sun,? 20 Sept?$/);
assert.equal(g.goalLine(data.vote.candidates[1]), '');
assert.equal(g.votesText(1), '1 vote');
assert.equal(g.votesText(3), '3 votes');
assert.equal(g.winnerNames(data.past[0]), 'Alex Able & Jo Bloggs');
assert.equal(g.watchable(data.vote.candidates[0]), 'link');
assert.equal(g.watchable(data.vote.candidates[1]), 'clip');
assert.equal(g.watchable({ clip: null, videoUrl: null }), null);
assert.equal(g.totalVotes(data.vote), null, 'hidden while open for members');
assert.equal(g.totalVotes(data.past[0]), 9);
console.log('gotm tests passed');
