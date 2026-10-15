/*
 * Home's league standing box: our row read from the FA's table (by headings or
 * the FA's usual layouts), and goals worked out from the FA's results.
 * Usage: node test/leagueStanding.test.js
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

const { standingFromFa, standingFromRow, goalsFromMatches, withGoals, ordinal } = require('../src/utils/leagueStanding.ts');

// The FA table as Syston's shows it: POS, team, P W D L PTS
const syston = standingFromFa(['POS', '', 'P', 'W', 'D', 'L', 'PTS'], ['4', 'Syston Town Juniors U18 Tigers', '5', '4', '1', '0', '13']);
assert.deepEqual(syston, {
  position: 4, team: 'Syston Town Juniors U18 Tigers', played: 5, won: 4, drawn: 1, lost: 0,
  goalsFor: null, goalsAgainst: null, goalDifference: null, points: 13,
});

// With goals, by heading (any case and spelling)
const full = standingFromFa(['Pos', 'Team', 'Pld', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'], ['2', 'Rovers', '6', '4', '1', '1', '15', '7', '+8', '13']);
assert.equal(full.goalsFor, 15);
assert.equal(full.goalsAgainst, 7);
assert.equal(full.goalDifference, 8);
assert.equal(full.points, 13);

// No headings: the FA's usual order after the name
const plain = standingFromFa([], ['7', 'Town', '5', '3', '1', '1', '12', '6', '6', '10']);
assert.deepEqual([plain.position, plain.played, plain.goalsFor, plain.goalsAgainst, plain.goalDifference, plain.points], [7, 5, 12, 6, 6, 10]);
assert.equal(standingFromFa([], ['3', 'Town', '5', '3']), null, 'an unknown layout is left out, not guessed');
assert.equal(standingFromFa(['POS', 'P'], ['1', '2']), null, 'no team name');

// Goals from results: home or away, score in one cell or two, postponed left out
const team = 'Syston Town Juniors U18 Tigers';
const matches = [
  ['13/09/26', 'Syston Town Juniors U18 Tigers', '3 - 1', 'Magna 73 U18'],
  ['20/09/26', 'Desford FC U18', '0 - 2', 'Syston Town Juniors U18 Tigers'],
  ['27/09/26', 'Syston Town Juniors U18 Tigers', '2', '2', 'Oadby Owls U18 Juniors'],
  ['04/10/26', 'Glen Villa Juniors U18', 'P - P', 'Syston Town Juniors U18 Tigers'],
  ['11/10/26', 'Syston Town Juniors U18 Tigers', '2-1', 'Borough Alliance Junior U18 Phoenix'],
  ['11/10/26', 'Syston Town Juniors U18 Tigers Reserves', '5 - 0', 'Somebody'],
];
assert.deepEqual(goalsFromMatches(matches, team), { played: 4, goalsFor: 9, goalsAgainst: 4 });

// Goals are only filled in when the results cover every game the table counts
const four = { ...syston, played: 4 };
assert.deepEqual(
  [withGoals(four, goalsFromMatches(matches, team)).goalsFor, withGoals(four, goalsFromMatches(matches, team)).goalDifference],
  [9, 5],
);
assert.equal(withGoals(syston, goalsFromMatches(matches, team)).goalsFor, null, '4 results for 5 games: left blank');
assert.equal(withGoals(full, { played: 6, goalsFor: 99, goalsAgainst: 0 }).goalsFor, 15, "the FA table's own goals win");

// Our own table
const own = standingFromRow({ position: 1, team: 'Us', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 });
assert.equal(own.goalDifference, 8);

assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st']);

console.log('leagueStanding tests passed');
