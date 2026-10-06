/* Calendar subscription links. Usage: node test/calendarLink.test.js */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const c = require('../src/utils/calendarLink.ts');
const url = 'https://api.example.com/public/syston-tigers/calendar.ics';
assert.equal(c.webcalUrl(url), 'webcal://api.example.com/public/syston-tigers/calendar.ics');
assert.equal(c.googleCalendarUrl(url), 'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fapi.example.com%2Fpublic%2Fsyston-tigers%2Fcalendar.ics');
console.log('calendar link tests passed');
