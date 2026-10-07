/* Cut-out mask helpers. Usage: node test/cutoutMask.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const m = require('../src/utils/cutoutMask.ts');

/** A 40×30 mask with a big person (a 10×20 block standing on the bottom) and a small one behind. */
function scene() {
  const width = 40, height = 30;
  const data = new Float32Array(width * height);
  for (let y = 10; y < 30; y++) for (let x = 5; x < 15; x++) data[y * width + x] = 0.95;
  for (let y = 5; y < 10; y++) for (let x = 30; x < 34; x++) data[y * width + x] = 0.9;
  return { width, height, data };
}

// The biggest person is kept, the one behind isn't
const s = scene();
const { region, size } = m.largestRegion(s);
assert.equal(size, 200);
assert.equal(region[20 * 40 + 8], 1);
assert.equal(region[6 * 40 + 31], 0);

// Distances: 0 inside, growing outside
const d = m.distanceTo(region, 40, 30);
assert.equal(d[20 * 40 + 8], 0);
assert.equal(d[20 * 40 + 16], 2);

// Alpha: solid inside, nothing at the far person
const a = m.alphaFor(s, region, 2);
assert.equal(a[20 * 40 + 8], 255);
assert.equal(a[6 * 40 + 31], 0);
assert.equal(a[2 * 40 + 2], 0);

// The crop hugs the person, leaves room at the top and sides, stands them on the bottom edge
const plan = m.planCutout(s);
assert.ok(!('problem' in plan));
assert.equal(plan.box.y + plan.box.height, 30);
assert.ok(plan.box.x <= 5 && plan.box.x >= 4);
assert.ok(plan.box.x + plan.box.width >= 15 && plan.box.x + plan.box.width <= 16);
assert.ok(plan.box.y <= 10);

// A soft edge on the mask comes through as a ramp
const soft = scene();
soft.data[20 * 40 + 15] = 0.5;
const softAlpha = m.alphaFor(soft, m.largestRegion(soft).region, 2);
assert.ok(softAlpha[20 * 40 + 15] > 0 && softAlpha[20 * 40 + 15] < 255);

// Nobody (or nearly nobody) in the picture
assert.ok('problem' in m.planCutout({ width: 40, height: 30, data: new Float32Array(1200) }));
const tiny = { width: 40, height: 30, data: new Float32Array(1200) };
tiny.data[100] = 1;
assert.ok('problem' in m.planCutout(tiny));
assert.equal(m.cropBox(new Uint8ClampedArray(12), 4, 3), null);

console.log('cutoutMask tests passed');

// Stretching keeps solid and clear areas
const up = m.upscale(Uint8ClampedArray.from([0, 255, 0, 255]), 2, 2, 4, 4);
assert.equal(up.length, 16);
assert.equal(up[0], 0);
assert.equal(up[3], 1);

// The guided filter snaps a blurry edge onto the photo's real edge
{
  const w = 20, h = 4;
  const guide = new Float32Array(w * h);
  const blurry = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    guide[y * w + x] = x < 10 ? 0.9 : 0.1; // the player is bright, the background dark; edge at x = 10
    blurry[y * w + x] = Math.min(1, Math.max(0, (14 - x) / 8)); // the mask fades out between 6 and 14
  }
  const snapped = m.guidedFilter(guide, blurry, w, h, 3, 1e-3);
  assert.ok(snapped[1 * w + 8] > blurry[1 * w + 8], 'inside the edge gets more solid');
  assert.ok(snapped[1 * w + 12] < blurry[1 * w + 12], 'outside the edge gets clearer');
  const alpha = m.refineAlpha(Uint8ClampedArray.from([255, 0, 255, 0]), 2, 2, new Float32Array(16).fill(0.5), 4, 4);
  assert.equal(alpha.length, 16);
}
console.log('cutoutMask refine tests passed');
