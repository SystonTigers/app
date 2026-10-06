/* Team talk helpers. Usage: node test/teamTalk.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const t = require('../src/utils/teamTalk.ts');

assert.deepEqual(t.splitTimes('Great press [1:05] and again [1:02:03].'), [
  { type: 'text', value: 'Great press ' }, { type: 'time', display: '[1:05]', seconds: 65 },
  { type: 'text', value: ' and again ' }, { type: 'time', display: '[1:02:03]', seconds: 3723 }, { type: 'text', value: '.' },
]);
assert.deepEqual(t.splitTimes('No times'), [{ type: 'text', value: 'No times' }]);
assert.equal(t.videoAt('https://youtu.be/abc', 65), 'https://youtu.be/abc?t=65');
assert.equal(t.videoAt('https://www.youtube.com/watch?v=abc', 65), 'https://www.youtube.com/watch?v=abc&t=65');
assert.equal(t.videoAt('https://example.com/v.mp4', 65), 'https://example.com/v.mp4');
assert.equal(t.mentionQuery('Well done @Pa'), 'Pa');
assert.equal(t.mentionQuery('email me@x'), null);
assert.equal(t.mentionQuery('done @Pat '), null);
assert.equal(t.insertMention('Well done @Pa', 'Pat Player'), 'Well done @Pat Player ');
assert.equal(t.repliesText(1), '1 reply');
assert.equal(t.repliesText(3), '3 replies');
assert.match(t.talkTime(1791300000), /Oct, \d{2}:\d{2}$/);
console.log('team talk tests passed');
