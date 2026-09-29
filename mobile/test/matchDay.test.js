/*
 * Match day decisions: at the ground or not, when to check, when to pop the video up.
 * Usage: node test/matchDay.test.js
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

const {
  distanceMeters, atVenueFrom, shouldCheckLocation, fixtureToCheck, popupFixture, pollInterval, fixtureTitle, playerDocument,
} = require('../src/utils/matchDay.ts');

const MIN = 60000;
const ground = { lat: 52.6993, lng: -1.0712 };

// ~111 m per 0.001° of latitude
assert.ok(Math.abs(distanceMeters(ground, { lat: 52.7003, lng: -1.0712 }) - 111) < 2);

// At the ground, away, or can't tell
assert.equal(atVenueFrom({ lat: 52.6995, lng: -1.0712, accuracy: 20 }, ground, 500), true);
assert.equal(atVenueFrom({ lat: 52.75, lng: -1.0712, accuracy: 50 }, ground, 500), false);
assert.equal(atVenueFrom({ lat: 52.7056, lng: -1.0712, accuracy: 300 }, ground, 500), null); // 700 m ± 300 m
assert.equal(atVenueFrom({ lat: 52.6995, lng: -1.0712, accuracy: 800 }, ground, 500), null); // here-ish, but ± 800 m
assert.equal(atVenueFrom({ lat: 52.6995, lng: -1.0712, accuracy: 5000 }, ground, 500), null); // too vague
assert.equal(atVenueFrom({ lat: 52.6995, lng: -1.0712, accuracy: 20 }, null, 500), null);

const fixture = (extra = {}) => ({
  id: 'f1', opponent: 'Rovers', date: '2026-10-04', time: '10:30', venue: null, competition: null, homeAway: 'home',
  kickOffAt: 1000 * MIN, matchStatus: 'scheduled', venueLocation: ground, stream: null, attendance: null, ...extra,
});

// Checks from an hour before kick-off until two and a half hours after
assert.equal(shouldCheckLocation(fixture(), 1000 * MIN - 61 * MIN), false);
assert.equal(shouldCheckLocation(fixture(), 1000 * MIN - 59 * MIN), true);
assert.equal(shouldCheckLocation(fixture(), 1000 * MIN + 149 * MIN), true);
assert.equal(shouldCheckLocation(fixture(), 1000 * MIN + 151 * MIN), false);
assert.equal(shouldCheckLocation(fixture({ venueLocation: null }), 1000 * MIN), false);
assert.equal(shouldCheckLocation(fixture({ attendance: { atVenue: false, source: 'manual' } }), 1000 * MIN), false);
assert.equal(shouldCheckLocation(fixture({ matchStatus: 'full_time' }), 1000 * MIN), false);
assert.equal(shouldCheckLocation(fixture({ kickOffAt: null }), 0), true);
assert.equal(fixtureToCheck({ fixtures: [fixture()], radiusMeters: 500, webPushKey: null }, 1000 * MIN).id, 'f1');
assert.equal(fixtureToCheck(null, 0), null);

// Pop the video up: live, not over, not dismissed, not at the ground
const stream = { videoId: 'abcdefghijk', watchUrl: '', embedUrl: '', status: 'live', source: 'link', embeddable: true };
const day = (f) => ({ fixtures: [f], radiusMeters: 500, webPushKey: null });
assert.equal(popupFixture(day(fixture({ stream })), []).id, 'f1');
assert.equal(popupFixture(day(fixture({ stream })), ['abcdefghijk']), null);
assert.equal(popupFixture(day(fixture({ stream, attendance: { atVenue: true, source: 'location' } })), []), null);
assert.equal(popupFixture(day(fixture({ stream, matchStatus: 'full_time' })), []), null);
assert.equal(popupFixture(day(fixture({ stream: { ...stream, status: 'ended' } })), []), null);

assert.equal(pollInterval(day(fixture())), MIN);
assert.equal(pollInterval({ fixtures: [], radiusMeters: 500, webPushKey: null }), 10 * MIN);
assert.equal(fixtureTitle({ opponent: 'Rovers', homeAway: 'away' }, 'Syston'), 'Rovers v Syston');

// The player page can't be broken out of by a crafted URL
assert.ok(!playerDocument('https://x"><script>').includes('"><script>'));

console.log('matchDay tests passed');
