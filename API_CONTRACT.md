# API Contract (v1)

Base URL (workers.dev):
- Backend: `https://syston-postbus.team-platform-2025.workers.dev`

All responses:
```json
{ "success": true, "data": { ... } }
```

Errors:
```json
{ "success": false, "error": { "code": "VALIDATION", "message": "..." } }
```

Auth:
- `Authorization: Bearer <JWT>`
- Roles: `admin`, `tenant_admin`
- `tenant_admin` tokens include `tenant_id`

---

## Admin

### POST /api/v1/admin/tenant/create

Create a tenant.

Body:
```json
{ "id":"club-123", "name":"Syston U12", "locale":"en-GB", "tz":"Europe/London" }
```

200 → `{ created: true, tenant: <TenantConfig> }`

### POST /api/v1/admin/tenant/webhook

Set per-tenant Make webhook (admin-side).

Body:
```json
{ "tenant":"club-123", "make_webhook_url":"https://hook.make.com/XXX" }
```

**Host Validation:**
- The webhook URL host must be in the allowlist configured via `ALLOWED_WEBHOOK_HOSTS`
- Supports exact hosts (`hook.make.com`, `webhook.site`)
- Supports suffix rules (`.make.com` matches `hook.eu2.make.com`, `hook.us1.make.com`, etc.)
- Supports wildcard style (`*.make.com` is equivalent to `.make.com`)
- The backend automatically adds `.make.com` suffix support globally

Returns 400 if host is not allowed.

### POST /api/v1/admin/tenant/flags

Set flags as admin.

Body:
```json
{ "tenant":"club-123", "flags": { "use_make": true, "direct_yt": false } }
```

### POST /api/v1/admin/tenant/invite

Generate a setup link for tenant admin.

Body:
```json
{ "tenant":"club-xyz","ttl_minutes":60 }
```

200 → `{ setup_url: "https://setup-console.../?token=..." }`

### POST /api/v1/admin/fixtures/refresh

Ping fixtures worker to refresh cache.

Body: `{ "tenant":"club-123" }` *(optional)*

### GET /api/v1/admin/yt/start?tenant=club-123

Return Google OAuth URL for YouTube.

200 → `{ url: "https://accounts.google.com/o/oauth2/..." }`

### GET /api/v1/admin/yt/callback?code=...&state=club-123

Exchange code → store refresh token in tenant config.

200: "YouTube connected…"

### POST /api/v1/post

Enqueue a job.

Body:
```json
{
  "tenant":"club-xyz",
  "template":"smoke",
  "channels":["yt"],
  "data": { "msg": "hello" }
}
```

Headers:
- `Idempotency-Key: <uuid/random>`

---

## Tenant Self-Serve

### GET /api/v1/tenant/self

200 → `{ id, flags, makeWebhookMasked }`

### POST /api/v1/tenant/self/webhook

Body:
```json
{ "make_webhook_url": "https://hook.make.com/XXX" }
```

Validates HTTPS + host allowlist.

### POST /api/v1/tenant/self/flags

Body:
```json
{ "use_make": true, "direct_yt": false }
```

### POST /api/v1/tenant/self/test-webhook

Sends a small JSON test payload to stored webhook.

---

## Stripe

### POST /api/v1/stripe/webhook

Consumes Stripe events; flips plan → flags.
**Recommend** signature verification or Zero-Trust protection.

---

## Webhook Host Allowlist

Env var `ALLOWED_WEBHOOK_HOSTS` (comma-separated), e.g.:
```
hook.make.com,webhook.site
```

---

## Status/Health

`GET /healthz` → `{ "ok": true, "ts": <ms> }`
