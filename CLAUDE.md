# Syston Tigers platform – guide for Claude

Read `START_HERE.md` first: it covers running, testing and deploying.
The code is the source of truth. Many older `.md` files describe plans from 2025
that changed; when a doc disagrees with the code, trust the code.

## What this is

A multi-club grassroots football app. One Cloudflare Worker serves every club
(tenant); each club's data is keyed by `tenant_id` in one D1 database.

| Folder | What it is |
|---|---|
| `backend/` | Cloudflare Worker API (TypeScript, Wrangler). Live as `app-production`. |
| `backend/migrations/` | D1 schema (`0001_baseline.sql` onwards; `archive/` is history only) |
| `mobile/` | Expo SDK 54 React Native app for players, parents and coaches |
| `web-app/` | Next.js site: landing page, club sign-up (`/create-team`), club pages and dashboards. Live as the `boost-huddle` Worker (OpenNext) |
| `owner-admin/` | Platform owner console |
| `packages/sdk/` | Typed API client shared by the web frontends |
| `video-processing/` | Python highlights editor (`highlights_bot`) and Docker processor |

There is no Google Apps Script or Google Sheets in the system any more. New
clubs sign up on `web-app` at `/create-team`, which registers the owner on the
Worker, sends a verification email and then saves the club's details.

## Backend conventions

- Routing is in `backend/src/index.ts`; handlers live in `backend/src/routes/`.
- Auth: `services/auth.ts` – `requireJWT`, `requireTenantJWT`, `requireStaff`,
  `hasAnyRole`. Tokens are HS256 JWTs signed with `JWT_SECRET`.
- Every query that reads or writes club data must filter by `tenant_id`.
- Roles are never taken from a client request; admins are created with
  `npm run admin:password[:prod]`.
- Storage: D1 `DB` (data), R2 `R2_MEDIA` (videos, images), KV (cache,
  idempotency, rate limits), queues for background work.
- Scheduled jobs, webhooks and queue consumers must be safe to run twice.

## Tests

`cd backend && npm test` runs three suites: node unit tests, Workers-runtime
tests and end-to-end journeys (`tests/e2e`) against a database built from
`migrations/`. Add an e2e journey when you add a user-facing flow.
Type checks: `npx tsc --noEmit` in `backend/`, `mobile/` and `web-app/`.

## Secrets

Set with `npx wrangler secret put NAME --env production`; never commit values.
`JWT_SECRET` is required. `RESEND_API_KEY` (email), `STRIPE_SECRET_KEY` and
`PRINTIFY_API_TOKEN` are optional until those features are used.
`claude-ops/` and `*.bundle` are git-ignored because they can contain backups
with personal data.

## Known gaps (September 2026)

- Email isn't sent until `RESEND_API_KEY` and a verified sending domain are set;
  until then emails are only logged.
- The mobile app is fixed to the Syston Tigers club (`syston-tigers`).
