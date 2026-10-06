/* Club history helpers. Usage: node test/history.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const h = require('../src/utils/history.ts');

assert.equal(h.awardTitle({ id: '1', award_type: 'custom', award_name: 'Clubman of the Year' }), 'Clubman of the Year');
assert.equal(h.awardTitle({ id: '1', award_type: 'golden_glove' }), 'Golden Glove');
assert.equal(h.awardTitle({ id: '1', award_type: 'custom', award_name: '  ' }), 'Award');
assert.equal(h.hasAwards('2025-26'), false);
assert.equal(h.hasAwards('all'), false);
assert.equal(h.hasAwards(null), false);
assert.equal(h.hasAwards('season_abc'), true);
assert.deepEqual(h.cardParts('2🟨 1🟥'), [{ count: '2', card: 'yellow' }, { count: '1', card: 'red' }]);
assert.deepEqual(h.cardParts(5), [{ count: '5', card: null }]);
assert.deepEqual(h.shownFunStats([{ key: 'hattrick_count', label: 'H', value: 0 }, { key: 'clean_sheets', label: 'C', value: 0 }]).map((s) => s.key), ['clean_sheets']);

console.log('history tests passed');
