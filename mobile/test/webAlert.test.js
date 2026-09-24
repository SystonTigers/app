/*
 * Alert.alert in the web app: messages show, confirmations run the right button.
 * Usage: node test/webAlert.test.js
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

const { showWebAlert } = require('../src/utils/webAlertLogic.ts');

function dialogs(confirmAnswer) {
  const shown = [];
  return {
    shown,
    alert: (m) => shown.push(['alert', m]),
    confirm: (m) => { shown.push(['confirm', m]); return confirmAnswer; },
  };
}

// Plain message
let d = dialogs(true);
showWebAlert(d, 'Saved', 'Your vote is in.');
assert.deepEqual(d.shown, [['alert', 'Saved\n\nYour vote is in.']]);

// One button: shown, then its handler runs
let ran = [];
d = dialogs(true);
showWebAlert(d, 'Done', undefined, [{ text: 'OK', onPress: () => ran.push('ok') }]);
assert.deepEqual(ran, ['ok']);
assert.equal(d.shown[0][1], 'Done');

// Confirm accepted runs the action, not cancel
ran = [];
d = dialogs(true);
showWebAlert(d, 'Delete?', 'This cannot be undone.', [
  { text: 'Cancel', style: 'cancel', onPress: () => ran.push('cancel') },
  { text: 'Delete', style: 'destructive', onPress: () => ran.push('delete') },
]);
assert.deepEqual(ran, ['delete']);
assert.equal(d.shown[0][0], 'confirm');

// Confirm declined runs cancel
ran = [];
showWebAlert(dialogs(false), 'Delete?', undefined, [
  { text: 'Cancel', style: 'cancel', onPress: () => ran.push('cancel') },
  { text: 'Delete', onPress: () => ran.push('delete') },
]);
assert.deepEqual(ran, ['cancel']);

console.log('webAlert tests passed');
