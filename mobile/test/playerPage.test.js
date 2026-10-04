/*
 * Player page helpers. Usage: node test/playerPage.test.js
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

const p = require('../src/utils/playerPage.ts');

assert.deepEqual(p.careerTiles({ appearances: 12, goals: 7, assists: 3, motm: 2, yellowCards: 1, redCards: 0 }).map((t) => `${t.label}:${t.value}`), ['APPS:12', 'GOALS:7', 'ASSISTS:3', 'MOTM:2']);
assert.deepEqual(p.careerTiles({ appearances: 12, goals: 7, assists: 3, motm: 2, yellowCards: 1, redCards: 0 }, false).map((t) => t.label), ['APPS', 'GOALS', 'MOTM']);
assert.equal(p.cardsText({ yellowCards: 2, redCards: 1 }), '2 yellow, 1 red');
assert.equal(p.cardsText({ yellowCards: 0, redCards: 1 }), '1 red');
assert.equal(p.cardsText({ yellowCards: 0, redCards: 0 }), null);
assert.equal(p.cardsText({ yellowCards: 1, redCards: 0, sinBins: 2 }), '1 yellow, 2 sin bins');
assert.equal(p.allTimeText({ appearances: 20, goals: 0, assists: 0, motm: 0, yellowCards: 1, redCards: 0, minutes: 1240 }), 'All time · 1,240 minutes · 1 yellow');
assert.equal(p.allTimeText({ appearances: 0, goals: 0, assists: 0, motm: 0, yellowCards: 0, redCards: 0 }), 'All time');

const clip = { opponent: 'Page Rovers', minute: 4, date: '2026-09-20' };
assert.equal(p.clipLabel(clip).title, "Goal v Page Rovers · 4'");
assert.match(p.clipLabel(clip).when, /Sun,? 20 Sept? 2026/);
assert.equal(p.clipLabel({ ...clip, minute: null }).title, 'Goal v Page Rovers');

const clips = [{}, {}, {}];
assert.equal(p.nextGoal(clips, -1), 0);
assert.equal(p.nextGoal(clips, 1), 2);
assert.equal(p.nextGoal(clips, 2), -1);

assert.equal(p.bioProblem('Left back, love a tackle. Scored 3-1 v Oadby @ home.'), null);
assert.match(p.bioProblem('insta @pat9'), /safe/);
assert.match(p.bioProblem('www.me.com'), /safe/);
assert.match(p.bioProblem('07700 900 123'), /safe/);
assert.match(p.bioProblem('a'.repeat(p.MAX_BIO + 1)), /under 400/);

assert.equal(p.initials('Pat Player'), 'PP');
assert.equal(p.initials('  Cher '), 'C');
assert.equal(p.initials(''), '?');

console.log('playerPage tests passed');
