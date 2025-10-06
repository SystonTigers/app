# Codex/Claude – Implementation Instructions (Paste-Ready)

## Scope
Keep backend Worker (API), fixtures Worker, Admin Console, and Setup Console in sync. Implement and maintain:

- Admin endpoints: create tenant, set webhook, flags, invite, fixtures refresh, YouTube OAuth, Stripe webhook, post.
- Tenant-self endpoints: self, webhook, flags, test-webhook.
- Queue consumer: per-tenant routing (BYO-Make vs Managed).
- Docs & CI/CD (this bundle + GitHub Actions).

## Files to Maintain
- `backend/src/index.ts` — routes above
- `backend/src/queue-consumer.ts` — per-tenant routing, DLQ on error
- `backend/src/services/{auth,util,tenants,jwt}.ts`
- `workers/fixtures/index.ts` — `/refresh`, `/healthz`
- `admin/index.ts` — forms for Create, Flags, Webhook, Invite, Fixtures, (optionally YT start)
- `setup/index.ts` — tenant UI page
- Configs: all `wrangler.toml` + routes (commented until DNS ready)

## Non-Negotiables
- Validate inputs via zod.
- Enforce roles (admin/tenant_admin).
- Respect webhook host allowlist.
- Never log secrets/webhook bodies.
- Preserve `Idempotency-Key` flow on `/post`.

## Build/Deploy
- `backend`: `npm run build && wrangler deploy`
- `workers/fixtures`, `admin`, `setup`: `wrangler deploy`
- CI: `.github/workflows/deploy.yml` with repo secrets `CF_API_TOKEN`, `CF_ACCOUNT_ID`.

## Testing Commands
See `CODEX_STEPS.md` for PowerShell curl one-liners and expected outputs.
