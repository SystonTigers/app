/*
 * Stats screen leaderboards.
 * Usage: node test/stats.test.js
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

const s = require('../src/utils/stats.ts');

const rows = s.readTotals([
  { id: 'a', name: 'Pat Player', number: 9, goals: 5, assists: 1, appearances: 6, minutes: 360, motmCount: 2, yellowCards: 1, redCards: 0, sinBins: 1 },
  { id: 'b', name: 'Sam Smith', number: 0, goals: 5, assists: 3, appearances: 4, minutes: 200, motmCount: 0, yellowCards: 0, redCards: 1 },
  { id: 'c', name: ' ', goals: 0, assists: 0, appearances: 2 },
  { id: 'd', name: 'Alex Able', goals: 2, assists: 0, appearances: 8 },
  { name: 'no id' },
  null,
]);
assert.equal(rows.length, 4);
assert.equal(rows[1].number, null, 'no "#0"');
assert.equal(rows[1].sinBins, 0, 'missing counts as 0');
assert.equal(rows[2].name, 'Unknown');
assert.deepEqual(s.readTotals({ data: [] }), []);

const goals = s.leaderboard(rows, 'goals');
assert.deepEqual(goals.map((r) => `${r.rank}:${r.player.id}:${r.value}`), ['1:b:5', '1:a:5', '3:d:2'], 'joint first, fewer apps first, players with none left out');
assert.deepEqual(s.leaderboard(rows, 'involvements').map((r) => r.player.id), ['b', 'a', 'd']);
assert.deepEqual(s.leaderboard(rows, 'discipline').map((r) => `${r.player.id}:${r.value}`), ['b:2', 'a:2']);
assert.equal(s.leaderboard(rows, 'goals', 1).length, 1);
assert.equal(s.disciplineText(rows[0]), '1 yellow · 1 sin bin');
assert.deepEqual(s.squadTotals(rows), { goals: 12, assists: 4, scorers: 3, motm: 2 });
assert.equal(s.BOARDS.length, 6);
console.log('stats tests passed');
