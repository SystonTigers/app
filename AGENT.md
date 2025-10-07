# Unified Automation + App Spec (v7.0)

This document centralizes automation guardrails for both the **Apps Script** codebase and **Cloudflare Workers** backend.

---

## System Architecture

**Dual-Stack Design:**
- **Cloudflare Workers Backend** — Edge compute for mobile app API (POST Bus, JWT auth, rate limiting)
- **Apps Script Orchestration** — Automation runtime for Sheets integration and admin tooling
- **Make.com Hub** — Social media publishing with Canva graphics generation

---

## Priority Stack

| Priority | Theme | Description |
| --- | --- | --- |
| P0 | Service Integrity | Keep production Workers and Apps Script green and idempotent |
| P1 | Customer Trust | Preserve automation flows, tenant configs, and Sheet Config as source of truth |
| P2 | Delivery Efficiency | Optimize with reusable modules and guardrails |
| P3 | Roadmap Velocity | Implement new capabilities without violating higher priorities |

---

## Runtime Configuration

### Cloudflare Workers

| Source | Key | Purpose |
| --- | --- | --- |
| Env Vars | `JWT_ISSUER`, `JWT_AUDIENCE` | JWT validation (`syston.app`, `syston-mobile`) |
| Env Vars | `FEATURE_DIRECT_YT/FB/IG` | Enable direct social publishing |
| Secrets | `JWT_SECRET`, `YT_API_KEY`, `MAKE_WEBHOOK_BASE` | Sensitive values (never commit) |
| KV_CACHE | `tenant:{id}` | Per-tenant configuration |
| KV_IDEMP | `idem:{tenant}:{hash}` | Idempotency cache (24h TTL) |

### Apps Script

| Source | Key | Purpose |
| --- | --- | --- |
| Sheet Config | `SHEET_ID`, `ENV`, `WEBHOOK_MAKE_URL` | Core configuration |
| Script Properties | `CACHE_TTL_MINUTES`, `ALLOWED_TRIGGERS` | Runtime settings |

---

## Idempotency Patterns

### Workers
- POST requests: `idempotency-key` header or SHA-256(body)
- KV_IDEMP storage with 24h TTL
- Queue consumer updates final results

### Apps Script
- Trigger creation: `ensureTimeTrigger()` prevents duplicates
- External calls: attach `requestId` header
- Sheet mutations: `operationId` in log sheet

---

## Agent Acceptance Criteria

### Cloudflare Workers ACs

1. All mutating endpoints MUST require `idempotency-key` or auto-hash payload
2. JWT authentication MUST be enforced on `/api/v1/*` (except `/healthz`, `/i18n`)
3. Rate limiting MUST apply per-tenant via Durable Objects (HTTP 429 with headers)
4. Queue consumer MUST retry (max 5) with DLQ handling
5. Adapter failures MUST fall back to Make.com
6. Responses MUST follow: `{ success: boolean, data?: any, error?: string }`
7. Secrets MUST use `wrangler secret put` (never commit)
8. Feature flags MUST gate direct integrations
9. Tenant isolation MUST enforce via JWT `tenant_id`
10. Observability MUST be enabled in wrangler.toml

### Apps Script ACs

1. Read/write config via Sheet Config + Script Properties (no inline constants)
2. HTTP calls use exponential backoff + JSON validation
3. Spreadsheet ops use `getValues()`/`setValues()` with header validation
4. Trigger management is idempotent
5. Error handling avoids PII leakage
6. Tests updated when behavior changes

---

## Testing Requirements

### Workers Testing
- Unit tests (Vitest): services, adapters (mock KV/Queue/DO)
- Integration tests: full `/api/v1/post` flow
- Synthetics (nightly): health check, sandbox post, queue drain
- Coverage target: 70%+

### Apps Script Testing
- Unit tests: `TestRunner.runAll()` in editor
- API tests: `api_tests.gs`
- Manual: control panel UI, triggers

---

## Security

### Workers
- JWT: issuer `syston.app`, audience `syston-mobile`
- Rate limiting: 5 req/sec per tenant per bucket
- Tenant isolation: all KV keys tenant-scoped
- Secrets: `wrangler secret put` only

### Apps Script
- OAuth scopes: minimal (Spreadsheets, Drive file, External Requests)
- ConsentGate: GDPR consent for minors
- Audit logging: all admin actions logged

---

## Deployment

### Workers
- CI/CD: `.github/workflows/deploy.yml` via Wrangler
- Secrets: managed via `wrangler secret put`
- Bindings: KV_CACHE, KV_IDEMP, POST_QUEUE, TenantRateLimiter (DO), R2_MEDIA

### Apps Script
- CI/CD: `.github/workflows/appsscript-push.yml` via clasp
- Web app: single `WEBAPP_DEPLOYMENT_ID`
- OAuth: flag scope changes in PR, manual re-auth required

---

## Feature Flags

### Workers
- `direct_yt` (true) — YouTube direct publishing (stub)
- `direct_fb/ig/tt` (false) — Future social integrations
- `use_make` (true) — Make.com fallback (always enabled)

### Apps Script
- `ENABLE_MAKE_WEBHOOKS` (true)
- `ENABLE_CONSENT_GATE` (true)

---

## Adapter Strategy

**Hierarchy:**
1. Make.com (Primary) — Always available
2. YouTube Direct (Planned) — OAuth required
3. Facebook/Instagram/TikTok Direct (Future)

**Fallback:** Direct adapter failure → route to Make.com

**Current Status:**
- ✅ Make.com: 100%
- ⚠️ YouTube: 30% stub
- ⚠️ Facebook/Instagram/TikTok: 30-40% stubs

---

**AGENT.md Version:** v7.0  
**Last Updated:** 2025-09-30  
**Next Review:** Quarterly or on major architecture changes
