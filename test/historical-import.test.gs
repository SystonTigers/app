/**
 * Unit tests for historical CSV import utilities.
 * These tests target CSV parsing edge cases, duplicate detection,
 * and the stability of the match hashing logic used for dedupe.
 */
function runHistoricalImportUnitTests() {
  const suite = createHistoricalSuite_('Historical Import CSV Processing');

  addHistoricalTest_(suite, 'parses varied CSV rows and generates events', function() {
    const csvText = [
      'Date,Home Team,Away Team,Comp,Venue,HS,AS,Scorers,Cards',
      "12/09/2024,Our Club,Rivals FC,League,Home,2,1,Player One 45'; Player Two 78',Player Three 60' yellow",
      ',,,,,,,,',
      "19-09-2024,Rivals FC,Our Club,Cup,Away,1,3,Player Four 22',Player Five 70' red"
    ].join('\n');

    const deps = createHistoricalTestDeps_();
    const result = parseHistoricalCsv_(csvText, deps);

    expectHistoricalEqual_(result.records.length, 2, 'Should parse two non-empty records');
    expectHistoricalEqual_(result.duplicates, 0, 'No duplicates expected in edge case CSV');

    const seasons = Object.keys(result.recordsBySeason);
    expectHistorical_(seasons.includes('2024/25'), 'Parsed season should include 2024/25');

    const firstRecord = result.records[0];
    expectHistoricalEqual_(firstRecord.events.length, 3, 'First record should create three events');

    const totalEvents = result.records.reduce(function(total, record) {
      return total + record.events.length;
    }, 0);
    expectHistoricalEqual_(result.projectedEventCount, totalEvents, 'Projected event count should match actual events');

    return 'Parsed 2 records, generated ' + totalEvents + ' events';
  });

  addHistoricalTest_(suite, 'detects duplicate matches by match key hash', function() {
    const csvText = [
      'Date,HomeTeam,AwayTeam,Competition,Venue,HS,AS,Scorers,Cards',
      "01/08/2024,Our Club,Rivals,Cup,Home,3,0,Player One 12',Player Two 30' yellow",
      "01/08/2024,Our Club,Rivals,Cup,Home,3,0,Player One 12',Player Two 30' yellow",
      "08/08/2024,Rivals,Our Club,Cup,Away,1,2,Player Three 70',"
    ].join('\n');

    const deps = createHistoricalTestDeps_();
    const result = parseHistoricalCsv_(csvText, deps);

    expectHistoricalEqual_(result.records.length, 2, 'Duplicate row should be skipped');
    expectHistoricalEqual_(result.duplicates, 1, 'Duplicate counter should be incremented');

    return 'Duplicate rows detected: ' + result.duplicates;
  });

  addHistoricalTest_(suite, 'produces stable match hash keys', function() {
    const deps = createHistoricalTestDeps_();
    const utilities = deps.utilities;
    const referenceDate = new Date(Date.UTC(2024, 7, 20));

    const keyA = buildMatchKey_(referenceDate, 'Our Club', 'Rivals FC', utilities);
    const keyB = buildMatchKey_(new Date(Date.UTC(2024, 7, 20)), '  our   club ', 'rivals fc ', utilities);

    expectHistoricalEqual_(keyA, keyB, 'Match keys should be normalized across casing and whitespace');

    return 'Normalized match key: ' + keyA;
  });

  return finalizeHistoricalSuite_(suite);
}

function createHistoricalTestDeps_() {
  return {
    utilities: {
      parseCsv: function(csvText) {
        return csvText.split(/\r?\n/).map(function(line) {
          return line.split(',').map(function(cell) {
            return cell.replace(/^"|"$/g, '').trim();
          });
        });
      },
      formatDate: function(date) {
        var year = date.getUTCFullYear();
        var month = String(date.getUTCMonth() + 1).padStart(2, '0');
        var day = String(date.getUTCDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
      }
    },
    stringUtils: {
      cleanPlayerName: function(name) {
        return String(name || '').trim();
      }
    },
    clubNameNormalized: 'our club',
    options: {}
  };
}

function createHistoricalSuite_(name) {
  return {
    name: name,
    tests: [],
    passed: 0,
    failed: 0
  };
}

function addHistoricalTest_(suite, name, fn) {
  try {
    var details = fn();
    suite.tests.push({ name: name, status: 'PASS', details: details || '' });
    suite.passed += 1;
  } catch (error) {
    suite.tests.push({
      name: name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error)
    });
    suite.failed += 1;
  }
}

function expectHistorical_(condition, message) {
  if (!condition) {
    throw new Error(message || 'Expected condition to be truthy');
  }
}

function expectHistoricalEqual_(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'Values should be equal') + ' (expected ' + expected + ', got ' + actual + ')');
  }
}

function finalizeHistoricalSuite_(suite) {
  suite.total = suite.passed + suite.failed;
  suite.status = suite.failed === 0 ? 'PASS' : 'FAIL';
  return suite;
}
