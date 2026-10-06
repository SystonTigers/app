/* Subs and fees + reported posts helpers. Usage: node test/clubAdmin.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const d = require('../src/utils/dues.ts');
const r = require('../src/utils/reports.ts');

assert.equal(d.pounds(25), '£25.00');
assert.equal(d.pounds(7.5), '£7.50');
assert.equal(d.parseAmount('25'), 25);
assert.equal(d.parseAmount('£12.50'), 12.5);
assert.equal(d.parseAmount('1,000'), 1000);
assert.equal(d.parseAmount('0'), null);
assert.equal(d.parseAmount('12.345'), null);
assert.equal(d.parseAmount('ten'), null);
assert.equal(d.parseAmount('20000'), null);
assert.equal(d.parseDueDate(''), '');
assert.equal(d.parseDueDate('31/03/2026'), '2026-03-31');
assert.equal(d.parseDueDate('2026-3-1'), '2026-03-01');
assert.equal(d.parseDueDate('31/02/2026'), null);
assert.equal(d.parseDueDate('next week'), null);

assert.equal(r.reasonLabel('harassment'), 'Bullying or harassment');
assert.equal(r.reasonLabel('weird'), 'weird');
assert.equal(r.reportTypeLabel('comment'), 'Team Talk comment');
assert.equal(r.actionLabel('removed'), 'Removed');
assert.equal(r.actionLabel(null), '');
assert.equal(new Set(r.REPORT_REASONS.map((x) => x.id)).size, 7);

console.log('club admin tests passed');
