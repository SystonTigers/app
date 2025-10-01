# Security Policy

## Auth & Roles
- JWT HS256 (`JWT_SECRET`), `iss`=`syston.app`, `aud`=`syston-mobile`.
- Roles:
  - `admin`: full admin endpoints.
  - `tenant_admin`: can only manage their own tenant via `/tenant/self/*`.
- Tenant-scoped tokens include `tenant_id`.

## Secrets & Storage
- Secrets via `wrangler secret` (never commit to git).
- KV_IDEMP stores tenant config under `tenant:<id>`. No PII.

## Webhooks
- Only allow HTTPS.
- Validate host via `ALLOWED_WEBHOOK_HOSTS` (e.g., `hook.make.com,webhook.site`).
- Do not log full webhook URLs or response bodies. Log status code only.

## CORS
- Allow only known origins: `https://localhost:5173`, `capacitor://localhost`, `https://app.YOURBRAND.com`, `https://admin.YOURBRAND.com`.
- Reflect exact origin, do not use `*` with credentials.

## Rate Limiting
- Durable Object rate limiter per tenant (sane defaults, e.g., 5 req/min).
- Admin can raise limits based on plan (future endpoint).

## Queues & DLQ
- Normal processing on `POST_QUEUE`.
- On processing error, message is **sent to `DLQ` and acked** (no retries **yet**).
- DLQ is for manual review/alerting (optional consumer later).

## Stripe
- Endpoint exists; add signature verification or protect behind Zero-Trust.

## Token Rotation
- Regenerate ADMIN_JWT if leaked.
- Rotate `JWT_SECRET` with caution (will invalidate existing tokens).
