/*
 * Drill Library helpers: built-in + club drills, filters, favourites, the form.
 * Usage: node test/drills.test.js
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
Module._resolveFilename = function (request, ...rest) {
  try { return resolve.call(this, request, ...rest); } catch (e) { return resolve.call(this, `${request}.ts`, ...rest); }
};

const { DRILLS_LIBRARY } = require('../src/data/drillsData.ts');
const { DRILL_DETAILS } = require('../src/data/drillDetails.ts');
const d = require('../src/utils/drills.ts');

// Every built-in drill has a full page
assert.equal(Object.keys(DRILL_DETAILS).length, DRILLS_LIBRARY.length);
for (const drill of DRILLS_LIBRARY) {
  const detail = DRILL_DETAILS[drill.id];
  assert.ok(detail, `details for ${drill.id}`);
  assert.ok(detail.setup.length > 10, `${drill.id} set-up`);
  assert.ok(detail.steps.length >= 3, `${drill.id} steps`);
  assert.ok(detail.coachingPoints.length >= 3, `${drill.id} coaching points`);
}

const club = [{
  id: '11111111-1111-1111-1111-111111111111', ref: 'club:11111111-1111-1111-1111-111111111111', name: 'Tigers Rondo', category: 'Passing',
  duration: '15 mins', durationMinutes: 15, players: '7', difficulty: 'advanced', equipment: ['Cones'], focus: ['rondo'], description: 'Keep it.',
  setup: '15 x 15 m', steps: ['Five out', 'Two in'], coachingPoints: ['Open body'], diagramUrl: null,
}];
const all = d.allDrills(club);
assert.equal(all.length, DRILLS_LIBRARY.length + 1);
assert.equal(all[0].ref, club[0].ref);
assert.equal(all[0].club, true);
const lib = d.findDrill('lib:drill-001', all);
assert.equal(lib.name, 'Dynamic Stretching');
assert.ok(lib.steps.length >= 3);
assert.equal(d.findDrill('club:nope', all), null);

assert.equal(d.refFrom('drill-012'), 'lib:drill-012');
assert.equal(d.refFrom('club:abc'), 'club:abc');
assert.equal(d.refFrom(undefined), null);

// Filters
assert.deepEqual(d.filterDrills(all, { view: 'club' }).map((x) => x.name), ['Tigers Rondo']);
assert.deepEqual(d.filterDrills(all, { view: 'favourites', favourites: ['lib:drill-002', club[0].ref, 'lib:gone'] }).map((x) => x.ref), ['lib:drill-002', club[0].ref]);
assert.ok(d.filterDrills(all, { query: 'rondo' }).some((x) => x.club));
assert.ok(d.filterDrills(all, { category: 'Shooting', difficulty: 'beginner' }).every((x) => x.category === 'Shooting' && x.difficulty === 'beginner'));
assert.equal(d.filterDrills(all, { view: 'favourites', favourites: [] }).length, 0);

// Links
assert.ok(d.looksLikeVideoLink('https://www.tiktok.com/@a/video/1'));
assert.ok(d.looksLikeVideoLink(' https://youtu.be/abc '));
assert.ok(!d.looksLikeVideoLink('https://evil.com/tiktok.com/'));

// Share text and the form
assert.match(d.shareText(all[0]), /Set-up: 15 x 15 m/);
assert.match(d.shareText(all[0]), /1\. Five out/);
const copy = d.formFromDrill(lib, true);
assert.equal(copy.name, 'Dynamic Stretching (our version)');
assert.equal(copy.duration, '10');
assert.equal(copy.players, 'All');
assert.equal(copy.steps.split('\n').length, lib.steps.length);
assert.equal(d.formProblem(d.emptyForm()), 'Give the drill a name.');
assert.match(d.formProblem({ ...d.emptyForm(), name: 'X', duration: '0' }), /minutes/);
assert.match(d.formProblem({ ...d.emptyForm(), name: 'X' }), /description or the steps/);
assert.equal(d.formProblem({ ...copy }), null);
assert.deepEqual(d.formBody({ ...d.emptyForm(), name: ' X ', steps: 'a\nb' }).name, 'X');

console.log('drills tests passed');
