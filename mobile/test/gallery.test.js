/* Gallery helpers. Usage: node test/gallery.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/gallery.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { seasonOf, groupBySeason, kindOf, photoCount, uploadSummary } = mod.exports;

assert.strictEqual(seasonOf('2025-08-01'), '2025/26');
assert.strictEqual(seasonOf('2026-07-31'), '2025/26');
assert.strictEqual(seasonOf('2026-08-02 10:00:00'), '2026/27');
assert.strictEqual(seasonOf('1999-12-25'), '1999/00');
assert.strictEqual(seasonOf(''), 'Undated');

const groups = groupBySeason([
  { id: 'a', date: '2026-09-20' },
  { id: 'b', date: '2025-06-14' },
  { id: 'c', date: '2026-08-10' },
  { id: 'd', date: 'nope' },
  { id: 'e', date: '2024-10-01' },
]);
assert.deepStrictEqual(groups.map((g) => g.season), ['2026/27', '2024/25', 'Undated']);
assert.deepStrictEqual(groups[0].albums.map((a) => a.id), ['a', 'c']);
assert.deepStrictEqual(groups[1].albums.map((a) => a.id), ['b', 'e']);

assert.strictEqual(kindOf('social').label, 'Days out');
assert.strictEqual(kindOf('mystery').id, 'social');
assert.strictEqual(photoCount(1), '1 photo');
assert.strictEqual(photoCount(0), '0 photos');
assert.strictEqual(uploadSummary(5, 5), 'Uploaded 5 photos.');
assert.strictEqual(uploadSummary(4, 5), "Uploaded 4 of 5 photos. 1 didn't upload, try it again.");
assert.strictEqual(uploadSummary(1, 3), "Uploaded 1 of 3 photos. 2 didn't upload, try them again.");
console.log('gallery tests passed');
