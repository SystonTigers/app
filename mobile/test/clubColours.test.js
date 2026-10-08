/* Club colour helpers. Usage: node test/clubColours.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const c = require('../src/utils/clubColours.ts');

assert.equal(c.normaliseHex('ffd700'), '#FFD700');
assert.equal(c.normaliseHex(' #ffd700 '), '#FFD700');
assert.equal(c.normaliseHex('#FFD70'), null);
assert.equal(c.normaliseHex('yellow'), null);
assert.ok(c.brightness('#FFFFFF') > 0.99);
assert.ok(c.brightness('#000000') < 0.01);
assert.equal(c.mainColourWarning('#FFD700'), null);
assert.ok(c.mainColourWarning('#111111'));
assert.ok(c.mainColourWarning('#1B2A5C'));
assert.equal(c.mainColourWarning('#0055B8'), null);
assert.equal(c.colourName('#ffd700'), 'Yellow');
assert.equal(c.colourName('#123456'), '#123456');
assert.equal(c.colourName(null), 'Not set');
assert.equal(new Set(c.KIT_COLOURS.map((k) => k.hex)).size, c.KIT_COLOURS.length);
console.log('clubColours tests passed');
