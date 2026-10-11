/* Tests for the web app's pull-to-refresh maths (src/platform/pullToRefresh.ts). */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } });
  module._compile(out.outputText, filename);
};

const { pullDistance, PULL_TRIGGER, PULL_MAX, scrolledAwayFromTop } = require('../src/platform/pullToRefresh.ts');

assert.equal(pullDistance(-20), 0);
assert.equal(pullDistance(0), 0);
assert.equal(pullDistance(Number.NaN), 0);
assert.equal(pullDistance(60), 30);
// A deliberate pull (about 13 cm of finger on a phone is ~130px) refreshes; a small tug doesn't
assert.ok(pullDistance(130) >= PULL_TRIGGER);
assert.ok(pullDistance(80) < PULL_TRIGGER);
assert.equal(pullDistance(10_000), PULL_MAX);

assert.equal(scrolledAwayFromTop([]), false);
assert.equal(scrolledAwayFromTop([{ scrollTop: 0 }, { scrollTop: -12 }]), false); // iPhone bounce
assert.equal(scrolledAwayFromTop([{ scrollTop: 0 }, { scrollTop: 340 }]), true);

console.log('pullToRefresh tests passed');
