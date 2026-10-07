/* Signing on helpers. Usage: node test/signingOn.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const s = require('../src/utils/signingOn.ts');

assert.equal(s.isoDate('14/3/2015'), '2015-03-14');
assert.equal(s.isoDate('2015-03-14'), '2015-03-14');
assert.equal(s.isoDate('31/02/2015'), null);
assert.equal(s.isoDate('soon'), null);
assert.equal(s.ukDate('2015-03-14'), '14/03/2015');

const d = s.draftFrom(null);
assert.equal(s.draftProblem(d, false), 'Add their date of birth, like 14/03/2015.');
d.dob = '14/03/2015';
assert.equal(s.draftProblem(d, false), 'Add at least one emergency contact.');
d.contacts = [{ name: 'Pat', relationship: '', phone: '12', email: '' }];
assert.equal(s.draftProblem(d, false), 'Add a phone number for Pat.');
d.contacts[0].phone = '07700 900123';
assert.equal(s.draftProblem(d, false), 'Answer the photo and video questions.');
d.photos = true; d.video = false;
assert.equal(s.draftProblem(d, true), "Tick to agree to the club's code of conduct.");
assert.equal(s.draftProblem(d, false), null);
d.contacts.push({ name: '', relationship: '', phone: '', email: '' });
assert.deepEqual(s.answersFrom(d), {
  details: { dob: '2015-03-14', address: null, school: null, medical: null, allergies: null },
  contacts: [{ name: 'Pat', relationship: null, phone: '07700 900123', email: null }],
  photos: true, video: false, agreeConduct: false,
});

const back = s.draftFrom({ playerId: 'p', details: { dob: '2015-03-14', address: 'x', school: null, medical: null, allergies: null }, contacts: [], photos: false, video: true, conductAgreed: true, submittedAt: 1, paid: false, paidAt: null });
assert.equal(back.dob, '14/03/2015');
assert.equal(back.contacts.length, 1);
assert.equal(back.video, true);

assert.equal(s.feeText(45), '£45');
assert.equal(s.feeText(45.5), '£45.50');
assert.equal(s.feeText(null), null);
assert.deepEqual(s.squadTotals([
  { playerId: 'a', name: 'A', number: 1, signedOn: true, submittedAt: 1, paid: true, linkedParents: 1 },
  { playerId: 'b', name: 'B', number: 2, signedOn: false, submittedAt: null, paid: false, linkedParents: 0 },
  { playerId: 'c', name: 'C', number: 3, signedOn: false, submittedAt: null, paid: false, linkedParents: 2 },
]), { total: 3, signedOn: 1, paid: 1, noParent: 1 });
console.log('signingOn tests passed');
