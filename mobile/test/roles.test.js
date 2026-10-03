/*
 * Roles: who is staff, the role people see, and who sees consent.
 * Usage: node test/roles.test.js
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

const { isStaffRole, isAdminRole, menuRole, clubRoleFromRoles, roleLabel, seesConsent } = require('../src/utils/roles.ts');

assert.ok(isStaffRole('coach'));
assert.ok(isStaffRole('owner'));
assert.ok(!isStaffRole('parent'));
assert.ok(!isStaffRole(undefined));
assert.ok(isAdminRole('admin'));
assert.ok(!isAdminRole('coach'));
assert.equal(menuRole('supporter'), 'parent');
assert.equal(menuRole(null), 'player');

// The most senior role wins; unknown roles are ignored
assert.equal(clubRoleFromRoles(['admin', 'owner']), 'owner');
assert.equal(clubRoleFromRoles(['manager', 'coach']), 'manager');
assert.equal(clubRoleFromRoles(['tenant_admin']), 'admin');
assert.equal(clubRoleFromRoles(['player']), 'player');
assert.equal(clubRoleFromRoles(['platform_owner']), null);
assert.equal(clubRoleFromRoles('owner'), null);

assert.equal(roleLabel('owner'), 'Owner');
assert.equal(roleLabel('supporter'), 'Supporter');
assert.equal(roleLabel('tenant_admin'), 'Admin');
assert.equal(roleLabel('something'), 'Member');
assert.equal(roleLabel(undefined), 'Member');

assert.ok(seesConsent('parent'));
assert.ok(seesConsent('player'));
assert.ok(!seesConsent('supporter'));

console.log('roles tests passed');
