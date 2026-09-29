/*
 * Cutting a highlights video from a recording (runs on a real MP4).
 * Usage: node test/highlightsVideo.test.js [path-to-test.mp4]
 * Without a file it only checks the timing helpers.
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { mergeSpans, spansInRecording, makeHighlightsVideo } = require('../src/services/highlightsVideo.ts');

assert.deepEqual(mergeSpans([{ start: 30, end: 40 }, { start: 5, end: 10 }, { start: 35, end: 50 }, { start: 60, end: 55 }]), [{ start: 5, end: 10 }, { start: 30, end: 50 }]);
assert.deepEqual(
  spansInRecording([{ fromKickOff: { start: -5, end: 10 } }, { fromKickOff: { start: 100, end: 120 } }], 30, 125),
  [{ start: 25, end: 40 }, { start: 130, end: 125 }].filter((s) => s.end > s.start).length === 1 ? [{ start: 25, end: 40 }] : null,
);

const file = process.argv[2];
if (!file) {
  console.log('highlightsVideo tests passed (timing only)');
  process.exit(0);
}

(async () => {
  const { BufferSource } = require('mediabunny');
  const data = fs.readFileSync(file);
  const progress = [];
  const out = await makeHighlightsVideo(new BufferSource(data), [{ start: 10.5, end: 15 }, { start: 30, end: 36 }, { start: 50, end: 55 }], (p) => progress.push(p));
  fs.writeFileSync(file.replace(/\.mp4$/, '-highlights.mp4'), out);
  assert.ok(out.length > 1000, 'made a file');
  assert.equal(progress[progress.length - 1], 1);
  console.log('highlightsVideo tests passed:', out.length, 'bytes');
})().catch((err) => { console.error(err); process.exit(1); });
