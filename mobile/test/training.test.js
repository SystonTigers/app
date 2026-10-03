/* Training Centre helpers. Usage: node test/training.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
function load(file) {
  const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => (p === '../data/drillsData' ? load('src/data/drillsData.ts') : require(p)));
  return mod.exports;
}
const { splitSessions, sessionDay, totalMinutes, drillOfTheWeek } = load('src/utils/training.ts');
const { DRILLS_LIBRARY } = load('src/data/drillsData.ts');

const now = new Date(2026, 9, 2, 20, 0);
const s = (date, time = '') => ({ session_date: date, session_time: time, id: `${date} ${time}` });
const { upcoming, past } = splitSessions([s('2026-10-09', '18:30'), s('2026-10-02', '18:00'), s('2026-09-25'), s('2026-10-07', '19:00'), s('2026-09-30', '18:00')], now);
assert.deepStrictEqual(upcoming.map((x) => x.session_date), ['2026-10-02', '2026-10-07', '2026-10-09']);
assert.deepStrictEqual(past.map((x) => x.session_date), ['2026-09-30', '2026-09-25']);

assert.match(sessionDay('2026-10-07', now), /^Wednesday,? 7 Oct$/);
assert.match(sessionDay('2025-10-07', now), /2025/);

assert.strictEqual(totalMinutes([{ duration: '10 mins' }, { duration: '15-20 mins' }, { duration: 'varies' }]), 25);

// Same drill all week (Mon-Sun), a different one next week, never a warm-up
const mon = drillOfTheWeek(new Date(2026, 8, 28));
assert.strictEqual(drillOfTheWeek(new Date(2026, 9, 4)).id, mon.id);
assert.notStrictEqual(drillOfTheWeek(new Date(2026, 9, 5)).id, mon.id);
assert.ok(!['Warm-up', 'Cool-down'].includes(mon.category));
console.log('training tests passed');
