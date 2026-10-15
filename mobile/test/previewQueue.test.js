/*
 * Graphic previews load three at a time; the rest wait their turn.
 * Usage: node test/previewQueue.test.js
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

const { makeSlots } = require('../src/utils/previewQueue.ts');

(async () => {
  const slots = makeSlots(3);
  const order = [];
  const frees = [];
  const jobs = [1, 2, 3, 4, 5].map((n) => slots.take().then((free) => { order.push(n); frees.push(free); }));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(order, [1, 2, 3], 'only three start');
  assert.deepEqual(slots.state(), { busy: 3, waiting: 2 });
  frees[0]();
  frees[0](); // giving the same slot back twice doesn't free two
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(order, [1, 2, 3, 4], 'the next one starts when one finishes, in order');
  frees[1]();
  frees[2]();
  frees[3]();
  await Promise.all(jobs);
  assert.deepEqual(order, [1, 2, 3, 4, 5]);
  frees[4]();
  assert.deepEqual(slots.state(), { busy: 0, waiting: 0 });
  console.log('previewQueue tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
