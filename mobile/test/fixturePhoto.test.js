/*
 * Fixtures from a photo: competition names and filling in the form.
 * Usage: node test/fixturePhoto.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const src = fs.readFileSync(path.join(__dirname, '../src/utils/fixturePhoto.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { competitionChoice, formFromPhoto, fitWithin } = mod.exports;

assert.strictEqual(competitionChoice('Leicester & District League Div 1'), 'League');
assert.strictEqual(competitionChoice('County Junior Cup R2'), 'Cup');
assert.strictEqual(competitionChoice('Charity Shield'), 'Cup');
assert.strictEqual(competitionChoice('Pre-season friendly'), 'Friendly');
assert.strictEqual(competitionChoice(null), 'League');

const f = { date: '2026-11-07', time: '10:30', home: 'Syston Tigers', away: 'Photo Rovers', venue: 'Syston Park', competition: 'Junior Cup', us: 'home' };
assert.deepStrictEqual(formFromPhoto(f, 'home'), { opponent: 'Photo Rovers', date: '2026-11-07', time: '10:30', venue: 'Syston Park', competition: 'Cup', homeAway: 'home' });
assert.deepStrictEqual(formFromPhoto({ ...f, time: null, venue: null }, 'away'), { opponent: 'Syston Tigers', date: '2026-11-07', time: '', venue: '', competition: 'Cup', homeAway: 'away' });

assert.deepStrictEqual(fitWithin(4032, 3024), { width: 1600, height: 1200 });
assert.deepStrictEqual(fitWithin(1170, 2532), { width: 739, height: 1600 });
assert.deepStrictEqual(fitWithin(800, 600), { width: 800, height: 600 });

console.log('fixturePhoto tests passed');
