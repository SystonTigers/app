/*
 * League at a glance: movement arrows, the rows around us, the live headline.
 * Usage: node test/leagueTable.test.js
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

const { movement, gdText, cell, aroundTeam, stripFor, liveHeadline, ourMoveText } = require('../src/utils/leagueTable.ts');

const row = (position, team, extra = {}) => ({ position, team, played: 5, won: 1, drawn: 1, lost: 3, goalsFor: 4, goalsAgainst: 6, goalDifference: -2, points: 4, ...extra });
const table = Array.from({ length: 8 }, (_, i) => row(i + 1, `Team ${i + 1}`));

// Movement against the saved table
assert.equal(movement({ position: 2, was: 4 }), 'up');
assert.equal(movement({ position: 4, was: 2 }), 'down');
assert.equal(movement({ position: 3, was: 3 }), 'same');
assert.equal(movement({ position: 3, was: null }), 'new');
assert.equal(movement({ position: 3 }), 'same');

assert.equal(gdText(3), '+3');
assert.equal(gdText(0), '0');
assert.equal(gdText(-2), '-2');
assert.equal(cell(null), '–');
assert.equal(cell(0), '0');

// The rows around us
assert.deepEqual(aroundTeam(table, 'team 4').map((r) => r.position), [2, 3, 4, 5, 6]);
assert.deepEqual(aroundTeam(table, 'Team 1').map((r) => r.position), [1, 2, 3, 4, 5]);
assert.deepEqual(aroundTeam(table, 'Team 8').map((r) => r.position), [4, 5, 6, 7, 8]);
assert.deepEqual(aroundTeam(table, 'Nobody'), []);
assert.deepEqual(aroundTeam(table, null), []);

// Home strip: saved table normally, the live one during a league game
const around = table.slice(1, 6);
assert.equal(stripFor(null), null);
assert.equal(stripFor({ ourTeam: null, rows: table, around: [], live: null }), null);
assert.deepEqual(stripFor({ ourTeam: 'Team 4', rows: table, around, live: null }), { rows: around, live: null });

const liveRows = [row(1, 'Team 4', { was: 4, playing: true }), ...table.filter((r) => r.team !== 'Team 4').map((r, i) => ({ ...r, position: i + 2, was: r.position }))];
const live = { fixtureId: 'f1', opponent: 'Oadby', opponentTeam: null, status: 'live', ourScore: 2, theirScore: 0, rows: liveRows };
const strip = stripFor({ ourTeam: 'Team 4', rows: table, around, live });
assert.equal(strip.live, live);
assert.deepEqual(strip.rows.map((r) => r.team), ['Team 4', 'Team 1', 'Team 2', 'Team 3', 'Team 5']);

assert.equal(liveHeadline(live), '2–0 v Oadby');
assert.equal(liveHeadline({ ...live, status: 'half_time' }), 'HT 2–0 v Oadby');
assert.equal(ourMoveText(live, 'Team 4'), 'Up to 1st');
assert.equal(ourMoveText({ ...live, rows: [row(3, 'Team 4', { was: 3 })] }, 'Team 4'), 'Staying 3rd');
assert.equal(ourMoveText({ ...live, rows: [row(5, 'Team 4', { was: 3 })] }, 'Team 4'), 'Down to 5th');
assert.equal(ourMoveText(live, 'Nobody'), null);

console.log('leagueTable tests passed');
