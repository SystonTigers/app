# Codex Collaboration Guidelines

These guidelines explain how GitHub Copilot / OpenAI Codex agents should
operate when assisting with this repository.

## Mission

- Provide concise, actionable suggestions that respect the project's
  configuration philosophy (Sheet Config tab → Script Properties → runtime
  reads).
- Keep generated code modular by feature and avoid introducing new dependencies
  without prior discussion.

## Interaction Rules

1. **Honor Existing Contracts** – Review `API_CONTRACT.md`,
   `README-Developer.md`, and the snippets in `README.md` before drafting
   changes.
2. **Avoid Sensitive Data** – Never invent or expose production sheet IDs,
   OAuth tokens, or deployment IDs. Use placeholders or configuration lookups
   instead.
3. **Idempotence First** – When suggesting installer or trigger updates, ensure
   the patterns remain idempotent to prevent duplicate jobs.
4. **Respect Logging Policy** – Suggest structured logs that redact or hash
   sensitive context.

## Code Generation Standards

- Prefer descriptive function names ending in `_svc` for server logic and `_ui`
  for HTML templates.
- Leverage helper utilities (e.g., `fetchJson`) instead of duplicating HTTP
  logic.
- Validate headers before reading spreadsheet data; fail fast with clear error
  messages.
- Use modern JavaScript (const/let, arrow functions where appropriate) and
  avoid deprecated Apps Script APIs.

## Review Checklist for Generated Changes

- [ ] Does the change keep configuration in the Sheet Config tab or Script
  Properties?
- [ ] Are spreadsheet operations batched using `getValues()`/`setValues()`?
- [ ] Do HTTP calls use the enterprise client pattern with backoff and safe
  parsing?
- [ ] Are triggers created or updated via the idempotent helpers?

Following these instructions ensures automated assistance remains aligned with
the maintainers' expectations.
