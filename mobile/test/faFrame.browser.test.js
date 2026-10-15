/*
 * The FA Full-Time frame (components/faFullTime/frame.ts) in a real browser,
 * against FA-style markup: our row in the club colour, other names dark, a tap
 * on a team stays in the app, our row is reported, and results filter to one
 * team. Needs Playwright (root npm install) and Chromium; not part of npm test.
 * Usage: node test/faFrame.browser.test.js
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }, fileName: filename });
  module._compile(outputText, filename);
};
const { frameDocument } = require('../src/components/faFullTime/frame.ts');
const { chromium } = require(require('node:path').join(__dirname, '..', '..', 'node_modules', 'playwright'));
const palette = { text: '#F2F5F7', muted: '#999', line: '#333', head: '#222', brand: '#F5D000', onBrand: '#06080B' };
// FA-like markup: their own styles make it white with dark text, team names are links
const TABLE = `<style>#lrepX table{background:#fff;color:#111}#lrepX td a{color:#1a0dab}</style><table><thead><tr><th>POS</th><th></th><th>P</th><th>W</th><th>D</th><th>L</th><th>PTS</th></tr></thead><tbody>
<tr><td>3</td><td><a href="https://fulltime.thefa.com/x">Riverside United Junior U18 Phoenix</a></td><td>5</td><td>4</td><td>1</td><td>0</td><td>13</td></tr>
<tr><td>4</td><td><a href="https://fulltime.thefa.com/y">Syston Town Juniors U18 Tigers</a></td><td>5</td><td>4</td><td>1</td><td>0</td><td>13</td></tr>
<tr><td>5</td><td><a href="https://fulltime.thefa.com/z">Ibstock United Juniors U18</a></td><td>4</td><td>4</td><td>0</td><td>0</td><td>12</td></tr></tbody></table>`;
const RESULTS = `<table><tr><th>Date</th><th>Home</th><th>Score</th><th>Away</th></tr>
<tr><td colspan="4">Sunday 11 October</td></tr>
<tr><td>11/10</td><td>Syston Town Juniors U18 Tigers</td><td>2 - 1</td><td>Borough Alliance Junior U18 Phoenix</td></tr>
<tr><td>11/10</td><td>Magna 73 U18</td><td>0 - 4</td><td>Desford FC U18</td></tr>
<tr><td colspan="4">Sunday 4 October</td></tr>
<tr><td>04/10</td><td>Ibstock United Juniors U18</td><td>1 - 1</td><td>Anstey Nomads U18 78s</td></tr>
<tr><td colspan="4">Sunday 27 September</td></tr>
<tr><td>27/09</td><td>Desford FC U18</td><td>0 - 3</td><td>Syston Town Juniors U18 Tigers</td></tr></table>`;

async function run(page, doc, markup) {
  await page.route('**/fulltime.thefa.com/**', (r) => r.abort());
  await page.setContent(doc);
  await page.evaluate(() => { window.__msgs = []; window.addEventListener('message', (e) => window.__msgs.push(JSON.parse(e.data))); });
  await page.evaluate((m) => { document.querySelector('[id^=lrep]').innerHTML = m.replace(/lrepX/g, document.querySelector('[id^=lrep]').id); }, markup);
  await page.waitForTimeout(400);
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 900 } });
  // Table: our row highlighted, names dark, taps post the team, our row reported
  await run(page, frameDocument('995652226', palette, 'Syston', { teamTaps: true }), TABLE);
  const look = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')];
    const a = (r) => getComputedStyle(r.querySelector('a'));
    return { mine: rows.map((r) => r.classList.contains('bh-mine')), other: a(rows[0]).color, ours: a(rows[1]).color, oursBg: getComputedStyle(rows[1].querySelector('td')).backgroundColor };
  });
  assert.deepEqual(look.mine, [false, true, false]);
  assert.equal(look.other, 'rgb(17, 17, 17)', 'other teams are dark, not the club colour');
  assert.equal(look.ours, 'rgb(6, 8, 11)');
  assert.equal(look.oursBg, 'rgb(245, 208, 0)', 'our row is in the club colour');
  await page.screenshot({ path: path.join(__dirname, '..', '.browser-check', 'fa-table.png') });
  await page.click('text=Ibstock United Juniors U18');
  await page.waitForTimeout(200);
  let msgs = await page.evaluate(() => window.__msgs);
  assert.ok(msgs.some((m) => m.team === 'Ibstock United Juniors U18'), 'tap posts the team');
  assert.equal(page.url(), 'about:blank', 'tap does not open FA Full-Time');
  const standing = msgs.find((m) => m.standing).standing;
  assert.deepEqual(standing, { headers: ['POS', '', 'P', 'W', 'D', 'L', 'PTS'], cells: ['4', 'Syston Town Juniors U18 Tigers', '5', '4', '1', '0', '13'] });

  // Results filtered to one team (with a quote in a name, to check it can't break out)
  await run(page, frameDocument('464806132', palette, '', { filter: 'Syston Town Juniors U18 Tigers' }), RESULTS);
  const shown = await page.evaluate(() => [...document.querySelectorAll('tr')].filter((r) => getComputedStyle(r).display !== 'none').map((r) => [...r.children].map((c) => c.textContent.trim()).join(' ')));
  assert.deepEqual(shown, ['Date Home Score Away', 'Sunday 11 October', '11/10 Syston Town Juniors U18 Tigers 2 - 1 Borough Alliance Junior U18 Phoenix', 'Sunday 27 September', '27/09 Desford FC U18 0 - 3 Syston Town Juniors U18 Tigers']);
  msgs = await page.evaluate(() => window.__msgs);
  const last = msgs.filter((m) => typeof m.matched === 'number').pop();
  assert.equal(last.matched, 2);
  await page.screenshot({ path: path.join(__dirname, '..', '.browser-check', 'fa-results.png') });

  await run(page, frameDocument('464806132', palette, '', { filter: `Bob's "Team" </script><b>` }), RESULTS);
  msgs = await page.evaluate(() => window.__msgs);
  assert.equal(msgs.filter((m) => typeof m.matched === 'number').pop().matched, 0, 'odd names are harmless and match nothing');
  await browser.close();
  console.log('frame checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
