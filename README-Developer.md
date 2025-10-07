# 🔧 Developer Guide - Library + Template Architecture

This document explains how to maintain and update the SystonAutomationLib library system.

## 🛠️ Runtime & Tooling Baselines

- **Node.js**: Use version `22` locally (`nvm use` will read from `.nvmrc`). This matches the CI runtime used by the GitHub Action that deploys the Apps Script project.
- **Formatting**: Run `npx prettier --write .` before committing. The repo's `.prettierrc` enforces a 2-space indent, single quotes, trailing commas, and LF line endings so our server and worker code render consistently in GAS and browser bundles.
- **Linting**: Run `npx eslint .` to lint Cloudflare Worker, PWA, and Apps Script code. The `.eslintrc.cjs` profile enables JSX/TypeScript-aware rules, Cloudflare Worker globals, and overrides that understand Apps Script globals.
- **Recommended dev dependencies** (install in a local clone once):
  ```bash
  npm install --save-dev \
    eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
    eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
    eslint-config-prettier prettier
  ```
- **VS Code integration**: Enable "Format on Save" and point ESLint to the workspace folder so both tools run automatically as you edit Apps Script, worker, or UI code.

## 📁 Project Structure

```
/library/               # Standalone Apps Script Library
  /lib/
    version.gs         # Version management
    config.gs          # Configuration system
    setup.gs           # Installation and sheet creation
    monitoring.gs      # Health checks and metrics
    privacy.gs         # GDPR compliance
    posting.gs         # Make.com integration
    logger.gs          # Logging system
    utils.gs           # Utility functions
    cache.gs           # Caching system
    security.gs        # Security and validation

/template/              # Customer Template (Bound Script)
  /app/
    ui.gs              # Menu system and UI functions
    wizard.html        # Setup Wizard interface
    dashboard.html     # System dashboard
    privacy.html       # Privacy manager interface
    app_main.gs        # Template wrapper functions
```

## 🚀 Publishing New Library Versions

### 1. Update Version
```javascript
// In library/lib/version.gs
const LIB_VERSION = '1.1.0';  // Increment version

// Update release notes in SA_getVersionInfo()
releaseDate: '2025-01-28',
features: [
  'New feature added',
  'Bug fixes',
  // ...
]
```

### 2. Test Changes
1. Deploy library to test environment
2. Create test template with library linked
3. Run through complete customer flow
4. Verify all functions work correctly

### 3. Deploy to Production
1. Open Library project in Apps Script
2. Click **Deploy** → **Manage deployments**
3. Click **New deployment**
4. Type: **Library**
5. Description: `v1.1.0 - Feature updates and bug fixes`
6. Click **Deploy**
7. Note the new version number

### 4. Update Template
1. Open Template project
2. Go to **Libraries**
3. Update SystonAutomationLib to new version
4. Test template functionality
5. Deploy template updates if needed

## 🏗️ Architecture Principles

### Library Design Rules
1. **Zero Hardcoding**: No club-specific literals anywhere
2. **SA_ Prefix**: All global functions prefixed with `SA_`
3. **Configuration Driven**: Everything through `SA_cfg_()`
4. **Error Handling**: Comprehensive try/catch with logging
5. **Idempotency**: Safe to run multiple times
6. **Privacy First**: GDPR compliance built-in

### Template Design Rules
1. **Thin Wrapper**: Minimal logic, mostly UI
2. **Library Calls**: Delegate to SystonAutomationLib
3. **User Friendly**: Clear error messages and help
4. **No Secrets**: Never store sensitive data
5. **Setup Wizard**: Guide users through configuration

## 🧪 Testing Checklist

Before releasing new versions:

### Library Tests
- [ ] `SA_health_()` returns correct status
- [ ] `SA_install_()` creates all required sheets
- [ ] `SA_cfg_()` validates configuration correctly
- [ ] `SA_processMatchEvent_()` handles all event types
- [ ] `SA_canPublishPlayer_()` enforces privacy rules
- [ ] All functions have `SA_` prefix
- [ ] No hardcoded club names or values

### Template Tests
- [ ] Setup Wizard opens automatically for new copies
- [ ] All menu items work correctly
- [ ] Health Check shows system status
- [ ] Privacy Manager functions correctly
- [ ] Dashboard displays real data
- [ ] Test Post works end-to-end

### Integration Tests
- [ ] Library + Template work together
- [ ] Fresh copy flow: Copy → Setup → Install → Working
- [ ] Privacy blocking: Player without consent blocked
- [ ] Make.com integration sends correctly
- [ ] Error handling graceful throughout

## ⏱️ Trigger Maintenance

### Idempotent System Triggers
- Run `setupSystemTriggers()` after installation or configuration changes.
- The helper now delegates to `ensureTimeTrigger()` so only `scheduledHealthCheck` and `cleanupExpiredCache` are created if missing—other `scheduled*` handlers remain untouched.

### Verification Steps
1. Execute `setupSystemTriggers()`.
2. Run `verifyScheduledTriggerIntegrity()` and review the logged summary.
3. Confirm `scheduledSystemMonitoring` and `scheduledLogCleanup` still report active triggers alongside the health check and cache cleanup jobs.

If any required handler reports `exists: false`, inspect the Triggers UI before re-running the specific installer that manages that job. Avoid bulk deletions; always rely on the idempotent helpers.

## 🔄 Customer Update Strategy

### Automatic Updates
The Template automatically:
- Checks library version on Health Check
- Shows "Check for Updates" in menu
- Guides users to update library version

### Breaking Changes
If breaking changes are needed:
1. Increment major version (2.0.0)
2. Document migration steps
3. Provide migration tool if possible
4. Support old version for transition period

### Backward Compatibility
- Minor versions (1.1.0) must be backward compatible
- New features should be optional
- Deprecate features before removing

## 📊 Monitoring & Analytics

### Library Usage Tracking
Each library call logs:
- Version being used
- Function called
- Success/failure status
- Error details if failed

### Template Health
Templates report:
- Setup completion status
- Active features enabled
- Error rates and types
- Performance metrics

## 🔧 Development Workflow

### 1. Local Development
```bash
# Work in library/ and template/ directories
# Test changes thoroughly
# Update version and documentation
```

### 2. Testing
```bash
# Deploy library to test environment
# Create test template
# Run through customer scenarios
# Verify all functionality
```

### 3. Production Release
```bash
# Deploy library as new version
# Update template to use new library version
# Update documentation
# Notify customers via release notes
```

## 📝 Code Standards

### Functions
```javascript
/**
 * Function description
 * @param {type} param - Parameter description
 * @return {type} Return description
 */
function SA_functionName_(param) {
  try {
    SA_log_('INFO', 'Function started', { param });

    // Function logic here

    SA_log_('INFO', 'Function completed', { result });
    return result;
  } catch (error) {
    SA_log_('ERROR', 'Function failed', { error: error.toString() });
    throw error;
  }
}
```

### Error Handling
- Always use try/catch
- Log errors with context
- Return consistent error objects
- Fail gracefully, don't break user experience

### Configuration
- Never hardcode values
- Use `SA_cfg_()` for all configuration
- Validate configuration on load
- Provide sensible defaults

## 🚨 Security Considerations

### Library Security
- Validate all inputs
- Sanitize user data
- Rate limit API calls
- Log security events
- No sensitive data in logs

### Template Security
- Check user permissions
- Validate webhook URLs
- Secure session handling
- CSRF protection where needed

## 📈 Performance Optimization

### Caching Strategy
- Cache expensive operations
- Use appropriate TTL values
- Clean up expired cache entries
- Monitor cache hit rates

### Batch Operations
- Process multiple items together
- Respect Apps Script execution limits
- Implement progress tracking
- Handle timeouts gracefully

---

This architecture allows you to:
- ✅ Update the engine (Library) without touching customer templates
- ✅ Deploy new features to all customers instantly
- ✅ Maintain a single codebase instead of hundreds of copies
- ✅ Provide professional support and troubleshooting
- ✅ Scale to thousands of customers without complexity