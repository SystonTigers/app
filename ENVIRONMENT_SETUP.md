# Environment Setup Guide

This guide explains how to bootstrap a clean developer workstation for the Syston Football automation platform covering both the Apps Script project (`src/`) and the Cloudflare Workers tooling.

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22.x LTS | Matches the CI workflow runtime.
| npm | 10.x | Ships with Node.js 22.x.
| `@google/clasp` | ^2.4 | Global install; authenticate with the shared service account.
| Git | Latest stable | Required for branching + CI hooks.
| Google Workspace account | Editor access to the customer Sheet | Needed to read the `CONFIG` tab and run installers.

> ℹ️ **Tip:** Install the Google Apps Script CLI only once per machine. Subsequent projects reuse the same `~/.clasprc.json` file.

## 2. Repository Bootstrap

```bash
# Clone and install Node dependencies
 git clone https://github.com/SystonTigers/Automation_script.git
 cd Automation_script
 npm install
```

1. Copy the production Sheet to a personal workspace or use a staging spreadsheet.
2. Populate the `CONFIG` tab with staging credentials (no production secrets).
3. Run the installer from the Apps Script editor or via `CustomerInstaller.installFromSheet()` to sync Script Properties.

## 3. Apps Script Authentication

```bash
npm install -g @google/clasp
clasp login --creds path/to/service-account.json
clasp status
```

- `clasp login` must use the same service account JSON that CI references through `CLASPRC_JSON`.
- `clasp status` confirms that the local `src/` directory mirrors the remote Apps Script project; a clean setup prints `~ 0`. If it fails, verify you are inside the repository root and that `.clasp.json` points to `src/`.

## 4. Validate the Environment

Use the new helper to confirm Script Properties, Sheet configuration, and trigger health:

```javascript
const report = validateEnvironment();
Logger.log(JSON.stringify(report, null, 2));
```

Expected output:

- `ok: true`
- `checks[].status` entries are all `PASS`
- `warnings` optionally surface optional configuration gaps (e.g., missing cache TTL)

If any check fails, run the `installForCustomer()` flow again and correct the flagged Sheet rows or missing Script Properties.

## 5. Cloudflare Workers Tooling

```bash
cd backend
npm install
npm run build
```

Set required bindings in `wrangler.toml` (local only) using placeholder values. **Do not** create extra deployments or secrets; reuse the managed namespaces listed in `docs/ARCHITECTURE.md`.

## 6. Smoke Tests

| Layer | Command | Purpose |
| --- | --- | --- |
| Apps Script | Run `TestRunner.runAll()` from the Apps Script editor | Confirms core library behaviors.
| Workers | `npm test` | Executes Vitest suites against queue/adapter mocks.
| End-to-end | Follow `qa/e2e-test-plan.md` | Ensures cross-stack integrations remain green.

> ✅ Run `validateEnvironment()` before shipping any change that modifies configuration readers, installers, or triggers.

---

_Last updated: 2025-10-05_
