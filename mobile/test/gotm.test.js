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
// Staff: running a vote
assert.deepEqual(g.recentMonths(new Date('2026-10-06T12:00:00Z'), 3), ['2026-09', '2026-08', '2026-07']);
assert.equal(g.monthLabel('2026-09'), 'September 2026');
assert.match(g.goalSummary({ opponent: 'Page Rovers', minute: 23, date: '2026-09-20' }), /^v Page Rovers · 23' · 20 Sept?$/);
assert.equal(g.newVoteProblem('2026-09', 1), "Pick at least 2 goals so there's something to vote on.");
assert.equal(g.newVoteProblem('2026-09', 11), 'Pick up to 10 goals.');
assert.equal(g.newVoteProblem('2026-09', 3), null);
assert.deepEqual(g.newVoteBody('2026-09', [{ eventId: 'e1', playerId: 'p1', fixtureId: 'f1' }], [{ playerId: 'p2', playerName: 'Sam', description: ' Volley ', videoUrl: ' ' }]),
  { month: '2026-09', goals: [{ eventId: 'e1', playerId: 'p1', fixtureId: 'f1' }, { playerId: 'p2', description: 'Volley', videoUrl: undefined }] });
console.log('gotm tests passed');
