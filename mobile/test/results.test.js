/* Results screen helpers. Usage: node test/results.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/results.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { seasonSummary, outcome, normaliseResultDate, checkResultForm, emptyResultForm, resultDate } = mod.exports;

// Summary counts from our side (homeScore is ours) and uses the server's points when given
const s = seasonSummary([
  { homeScore: 3, awayScore: 1, points: 3 },
  { homeScore: 2, awayScore: 2 },
  { homeScore: 0, awayScore: 4, points: 0 },
]);
assert.deepStrictEqual(s, { played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 5, goalsAgainst: 7, points: 4 });
assert.deepStrictEqual(seasonSummary([]).played, 0);
assert.strictEqual(outcome(1, 0), 'W');
assert.strictEqual(outcome(1, 1), 'D');
assert.strictEqual(outcome(0, 1), 'L');

// Dates: ISO, UK and short years; impossible dates refused
assert.strictEqual(normaliseResultDate('2025-09-14'), '2025-09-14');
assert.strictEqual(normaliseResultDate('14/09/2025'), '2025-09-14');
assert.strictEqual(normaliseResultDate('4/9/24'), '2024-09-04');
assert.strictEqual(normaliseResultDate('31/02/2025'), null);
assert.strictEqual(normaliseResultDate('next sunday'), null);
assert.match(resultDate('2025-09-14'), /^Sun,? 14 Sept? 2025$/);

// The form
const today = new Date(2026, 9, 2, 12);
assert.strictEqual(emptyResultForm(today).date, '2026-10-02');
const ok = checkResultForm({ date: '14/09/2025', opponent: '  Rovers   FC ', ourScore: '3', theirScore: '0', venue: ' ', competition: 'Cup', picks: { scorerIds: ['sam', 'sam', 'alex'], ownGoals: 0 } }, today);
assert.deepStrictEqual(ok, { date: '2025-09-14', opponent: 'Rovers FC', ourScore: 3, theirScore: 0, venue: null, competition: 'Cup', scorerIds: ['sam', 'sam', 'alex'], ownGoals: 0 });
// Scorers untouched: nothing sent; more scorers than goals: refused
assert.ok(!('scorerIds' in checkResultForm({ date: '14/09/2025', opponent: 'X', ourScore: '1', theirScore: '0', venue: '', competition: 'League', picks: null }, today)));
assert.match(checkResultForm({ date: '14/09/2025', opponent: 'X', ourScore: '1', theirScore: '0', venue: '', competition: 'League', picks: { scorerIds: ['a'], ownGoals: 1 } }, today), /picked 2 scorers but we only scored 1/);
const { scorerChips, removeOneGoal } = mod.exports;
assert.deepStrictEqual(scorerChips(['a', 'b', 'a'], new Map([['a', 'Pat'], ['b', 'Sam']])), [{ id: 'a', name: 'Pat', goals: 2 }, { id: 'b', name: 'Sam', goals: 1 }]);
assert.deepStrictEqual(removeOneGoal({ scorerIds: ['a', 'b', 'a'], ownGoals: 1 }, 'a'), { scorerIds: ['a', 'b'], ownGoals: 1 });
assert.match(checkResultForm({ ...emptyResultForm(today), date: '03/10/2026', opponent: 'X', ourScore: '1', theirScore: '1' }, today), /future/);
assert.match(checkResultForm({ ...emptyResultForm(today), opponent: '', ourScore: '1', theirScore: '1' }, today), /who you played/);
assert.match(checkResultForm({ ...emptyResultForm(today), opponent: 'X', ourScore: '1', theirScore: '' }, today), /both scores/);
assert.match(checkResultForm({ ...emptyResultForm(today), opponent: 'X', ourScore: '-1', theirScore: '2' }, today), /both scores/);
assert.match(checkResultForm({ ...emptyResultForm(today), date: '2025/13/40', opponent: 'X', ourScore: '1', theirScore: '2' }, today), /match date/);
console.log('results tests passed');
