/* Player first names and surnames. Usage: node test/playerNames.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText, filename);
};
const { namePartsOf, playerInitials } = require('../src/utils/playerNames.ts');

assert.deepEqual(namePartsOf({ name: 'x', first_name: 'Mary Jane', last_name: 'Watson' }), { first: 'Mary Jane', last: 'Watson' });
assert.deepEqual(namePartsOf({ name: 'Sam  Smith' }), { first: 'Sam', last: 'Smith' });
assert.deepEqual(namePartsOf({ name: 'Alfie James Smith', first_name: null }), { first: 'Alfie', last: 'James Smith' });
assert.deepEqual(namePartsOf({ name: 'Cher' }), { first: 'Cher', last: '' });
assert.deepEqual(namePartsOf({}), { first: '', last: '' });
assert.equal(playerInitials({ first_name: 'Mary Jane', last_name: 'Watson' }), 'MW');
assert.equal(playerInitials({ name: 'virgil van dijk' }), 'VV');
assert.equal(playerInitials({}), '?');
console.log('playerNames tests passed');
