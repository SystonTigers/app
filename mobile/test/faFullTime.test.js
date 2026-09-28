/*
 * FA Full-Time snippet frame.
 * Usage: node test/faFullTime.test.js
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
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === '../../config') return require.resolve('./stubs/config.js');
  return resolve.call(this, request, parent, ...rest);
};

const { frameDocument, isSnippetCode, parseFrameMessage } = require('../src/components/faFullTime/frame.ts');

assert.equal(isSnippetCode('995652226'), true);
assert.equal(isSnippetCode("995652226'</script>"), false);
assert.equal(isSnippetCode(undefined), false);

const palette = { text: '#ffffff', muted: '#c0c0c0', line: '#2f3439', head: '#15181c', brand: '#00ffff' };
const doc = frameDocument('995652226', palette, "Syston'</script>");
assert.match(doc, /var lrcode='995652226'/);
assert.match(doc, /id="lrep995652226"/);
assert.match(doc, /src="https:\/\/fulltime\.thefa\.com\/client\/api\/cs1\.js"/);
assert.match(doc, /mine='systonscript'/, 'highlight is stripped to letters and digits');
assert.doesNotMatch(frameDocument('995652226', { ...palette, brand: 'red;}</style><script>' }, ''), /<\/style><script>/, 'colours are validated');

assert.deepEqual(parseFrameMessage('{"bh":"fa","height":420,"rows":12}'), { bh: 'fa', height: 420, rows: 12 });
assert.equal(parseFrameMessage('{"height":1}'), null);
assert.equal(parseFrameMessage('not json'), null);

console.log('faFullTime tests passed');
