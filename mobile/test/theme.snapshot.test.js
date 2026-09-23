/*
 * Lightweight snapshot check for the mobile design tokens.
 * Usage: npm run test:snapshots
 *        UPDATE_SNAPSHOTS=1 npm run test:snapshots  (after an intentional theme change)
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2019,
  esModuleInterop: true,
  jsx: ts.JsxEmit.React,
};

['.ts', '.tsx'].forEach((ext) => {
  require.extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions,
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
});

const { createColorRamp, buildTenantTheme, defaultTheme } = require('../src/theme');

const snapshot = {
  defaultRamp: createColorRamp(defaultTheme.colors.primary),
  tenantTheme: pickTheme(
    buildTenantTheme({
      primaryColor: '#1F6FEB',
      secondaryColor: '#152A56',
      accentColor: '#F97316',
      brandName: 'Snapshot FC',
      customColors: {
        textInverse: '#FFFFFF',
      },
    })
  ),
};

const snapshotPath = path.join(__dirname, '__snapshots__', 'theme.json');

// UPDATE_SNAPSHOTS=1 npm test  -> rewrite the snapshot after an intentional theme change
if (process.env.UPDATE_SNAPSHOTS === '1') {
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log('Theme snapshot updated');
  process.exit(0);
}

const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

try {
  assert.deepStrictEqual(snapshot, expected);
  console.log('Theme snapshot OK');
} catch (error) {
  console.error('Theme snapshot mismatch.');
  throw error;
}

function pickTheme(theme) {
  return {
    colors: theme.colors,
    ramps: theme.ramps,
    spacingScale: theme.spacingScale,
    typographyScale: theme.typographyScale,
    metadata: theme.metadata,
  };
}
