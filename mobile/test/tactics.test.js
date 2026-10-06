/* Tactics helpers. Usage: node test/tactics.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const t = require('../src/utils/tactics.ts');

assert.deepEqual(t.readTactics(null), t.DEFAULT_TACTICS);
const r = t.readTactics({ formation: '4-3-3', pressingIntensity: 'extreme', phases: { attacking: { tempo: 'low' } } });
assert.equal(r.formation, '4-3-3');
assert.equal(r.pressingIntensity, 'medium');
assert.deepEqual(r.phases.attacking, { width: 'wide', tempo: 'low' });
assert.equal(t.readTactics({ formation: 'banana' }).formation, '4-4-2');
for (const f of t.FORMATIONS) assert.equal(t.positions(f).length, t.playerCount(f), f);
assert.equal(t.playerCount('4-3-3'), 11);
assert.equal(t.playerCount('2-3-1'), 7);
const p = t.positions('4-4-2');
assert.deepEqual(p[0], { x: 0.5, y: 0.06 });
assert.ok(p.every((q) => q.x > 0 && q.x < 1 && q.y > 0 && q.y < 1));
assert.equal(t.levelLabel('high'), 'High');
console.log('tactics tests passed');
