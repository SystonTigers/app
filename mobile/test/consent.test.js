/*
 * Photo and video consent helpers.
 * Usage: node test/consent.test.js
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

const { consentSummary, awaitingAnswer, nameList, filterConsent } = require('../src/utils/consent.ts');

const players = [
  { name: 'Sam Smith', photos: true, video: true, linkedParents: 2 },
  { name: 'Jo Jones', photos: true, video: false, linkedParents: 1 },
  { name: 'Alex Hall', photos: null, video: null, linkedParents: 0 },
  { name: 'Kai Lee', photos: false, video: null },
];
assert.deepEqual(consentSummary(players), { photosYes: 2, videoYes: 1, notAnswered: 2, noParent: 2 });
const names = (list) => list.map((p) => p.name.split(' ')[0]);
assert.deepEqual(names(filterConsent(players, 'unanswered')), ['Alex', 'Kai']);
assert.deepEqual(names(filterConsent(players, 'noVideo')), ['Jo', 'Alex', 'Kai']);
assert.deepEqual(names(filterConsent(players, 'noParent')), ['Alex', 'Kai']);
assert.equal(filterConsent(players, 'all').length, 4);
assert.deepEqual(awaitingAnswer(players), ['Alex Hall', 'Kai Lee']);
assert.equal(nameList([]), '');
assert.equal(nameList(['Sam']), 'Sam');
assert.equal(nameList(['Sam', 'Jo']), 'Sam and Jo');
assert.equal(nameList(['Sam', 'Jo', 'Alex']), 'Sam, Jo and Alex');
console.log('consent tests passed');
