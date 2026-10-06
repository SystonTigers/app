/* Friendlies helpers. Usage: node test/friendlies.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const f = require('../src/utils/friendlies.ts');

assert.deepEqual(f.postTags({ age_group: 'U12', location_pref: 'home', max_travel_miles: 20, pitch_type: '3g', kit_colors: 'Amber' }), ['U12', 'Home', 'Up to 20 miles', '3G', 'Kit: Amber']);
assert.deepEqual(f.postTags({ age_group: null, location_pref: 'any', max_travel_miles: null, pitch_type: 'any', kit_colors: null }), ['Home or away']);
assert.equal(f.postBody(f.blankPost()), 'Pick the age group.');
const body = f.postBody({ ...f.blankPost(), age_group: 'U9', max_travel_miles: '900', notes: ' Sat mornings ' });
assert.equal(body.max_travel_miles, 500);
assert.equal(body.notes, 'Sat mornings');
assert.equal(f.postBody({ ...f.blankPost(), age_group: 'U9', max_travel_miles: '' }).max_travel_miles, null);
assert.equal(f.clubName({ team_name: 'syston', team_display_name: 'Syston Tigers' }), 'Syston Tigers');
console.log('friendlies tests passed');
