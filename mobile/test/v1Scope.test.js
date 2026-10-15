/*
 * Version 1 scope: match-day screens stay linked, shelved ones don't, and the
 * build switch brings them all back.
 * Usage: node test/v1Scope.test.js
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

const { SHELVED_SCREENS, isScreenShown, showsShelved } = require('../src/utils/v1Scope.ts');

// Match day stays
for (const screen of ['LiveMatch', 'MatchCentre', 'Matches', 'Results', 'LeagueTable', 'Availability', 'MOTMVoting', 'ManageMOTM', 'Squad', 'Player', 'Stats', 'ManageSquad', 'ManageFixtures', 'Opponents', 'ClubSettings', 'MediaConsent']) {
  assert.equal(isScreenShown(screen, false), true, screen);
}
// Shelved, not deleted
for (const screen of ['Training', 'DrillLibrary', 'Tactics', 'Videos', 'MatchHighlights', 'ManageGotm', 'LastManStanding', 'TeamTalk', 'Gallery', 'ClubHistory', 'CreatePost', 'ManageEvents', 'Friendlies', 'Shop', 'SigningOn', 'Dues', 'Carpool', 'ScoutNotes']) {
  assert.equal(isScreenShown(screen, false), false, screen);
  assert.equal(isScreenShown(screen, true), true, screen);
}

// Every shelved screen is still registered in the app, so it keeps working
const app = fs.readFileSync(require.resolve('../App.tsx'), 'utf8');
for (const screen of SHELVED_SCREENS) {
  assert.ok(app.includes(`name="${screen}"`), `${screen} is still a screen in App.tsx`);
}

// The build switch
assert.equal(showsShelved(undefined), false);
assert.equal(showsShelved(''), false);
assert.equal(showsShelved('0'), false);
assert.equal(showsShelved('1'), true);
assert.equal(showsShelved('true'), true);

console.log('v1Scope tests passed');
