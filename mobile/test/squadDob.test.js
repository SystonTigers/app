/* Squad date of birth helpers. Usage: node test/squadDob.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const d = require('../src/utils/squadDob.ts');
const now = new Date('2026-10-08T12:00:00Z');
assert.equal(d.dobProblem('14/03/2012', now), null);
assert.equal(d.dobProblem('2012-03-14', now), null);
assert.match(d.dobProblem('31/02/2012', now), /day\/month\/year/);
assert.match(d.dobProblem('March 2012', now), /day\/month\/year/);
assert.match(d.dobProblem('14/03/2030', now), /hasn't happened/);
assert.match(d.dobProblem('14/03/1900', now), /over 100/);
assert.equal(d.birthdayLabel('2012-03-14'), '14 Mar');
console.log('squadDob tests passed');
