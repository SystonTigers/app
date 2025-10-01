# SystonApp – Football Team Platform (Workers + Queues)

A multi-tenant football team organiser with:
- Mobile app backend (Cloudflare Workers + Queues)
- Fixtures fetcher/refresh worker
- Admin Console (web) for ops
- BYO-Make self-serve (per-tenant webhook)
- Managed pipeline (direct YouTube, optional)
- Stripe webhook for plan flips
- GitHub Actions auto-deploy

## Architecture

**Workers**
- `backend/` — API, queues, Durable Object rate limiter, KV for tenants
- `workers/fixtures/` — fixtures cache + `/refresh`
- `admin/` — password-protected console (Basic Auth)
- `setup/` — tenant self-serve page (consumes `?token=`)

**Data**
- **KV_IDEMP**: per-tenant config (`tenant:<id>`)
  ```json
  {
    "id": "club-123",
    "flags": { "use_make": false, "direct_yt": true },
    "makeWebhookUrl": "https://hook.make.com/XXX",
    "youtube": { "refresh_token": "..." } // optional
  }
  ```

**Queues**
- `POST_QUEUE` — inbound jobs (`{tenant, template, channels, data}`)
- `DLQ` — failures (manual review)

**Flags**
- `use_make` = true → forward job to tenant's webhook
- `direct_yt` = true → use Managed direct pipeline (e.g., YouTube)

Default on tenant creation: `use_make:false`, `direct_yt:true`.

## Endpoints (high level)

**Admin (JWT role = `admin`)**
- `POST /api/v1/admin/tenant/create`
- `POST /api/v1/admin/tenant/webhook`
- `POST /api/v1/admin/tenant/flags` *(exists already)*
- `POST /api/v1/admin/tenant/invite` → returns setup URL with token
- `POST /api/v1/admin/fixtures/refresh`
- `GET  /api/v1/admin/yt/start` → return Google OAuth URL
- `GET  /api/v1/admin/yt/callback` → store YouTube refresh token
- `POST /api/v1/post` → enqueue job

**Tenant self-serve (JWT role = `tenant_admin`)**
- `GET  /api/v1/tenant/self`
- `POST /api/v1/tenant/self/webhook`
- `POST /api/v1/tenant/self/flags`
- `POST /api/v1/tenant/self/test-webhook`

**Stripe (unauth or Zero-Trust protected)**
- `POST /api/v1/stripe/webhook` → flips flags based on plan

## Security

- JWT HS256; roles: `admin` and `tenant_admin`; `tenant_id` in claims for tenant routes.
- Admin Console: Basic Auth + ADMIN_JWT (secret).
- URL allowlist for webhooks (`ALLOWED_WEBHOOK_HOSTS`).
- CORS: only allowed origins (localhost/dev + app domains).
- Rate limiter DO (per-tenant).

See `SECURITY.md` for details.

## Deploy (short)

```bash
# backend
cd backend
npm i
npm run build
wrangler deploy

# fixtures
cd ../workers/fixtures
wrangler deploy

# admin
cd ../../admin
wrangler deploy

# setup console (tenant UI)
cd ../setup
wrangler deploy
```

## Custom Domains

Uncomment `routes = [...]` in each `wrangler.toml`, add DNS CNAMEs in Cloudflare, deploy.

## CI/CD

See `.github/workflows/deploy.yml`. Add repo secrets:
- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`
