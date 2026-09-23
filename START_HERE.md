# Start here

Everything below was checked against the code in September 2026. If another
doc disagrees with this one, trust this one (and the code).

## What's live

| Piece | Where |
|---|---|
| Backend API (Cloudflare Worker) | `app-production` → https://app-production.team-platform-2025.workers.dev |
| Database | D1 `syston-db` (binding `DB`), schema from `backend/migrations/` |
| Club | slug `syston-tigers` |
| Mobile app | `mobile/` (Expo SDK 54), points at `app-production` by default |

`syston-postbus` and `app` are older Workers and are not used by the apps any more.

## Run the backend locally

```powershell
cd C:\dev\app-FRESH\backend
npm install
npm run db:migrate          # builds the local database from migrations/
npm run seed:syston         # local test club (slug syston-tigers)
npm run admin:password      # create/reset your admin login (asks for a password)
npx wrangler dev --local --port 8787
```

Check it: open http://localhost:8787/healthz

## Run the mobile app against your PC

1. Copy `mobile/.env.example` to `mobile/.env`
2. Set `EXPO_PUBLIC_API_BASE=http://<your PC's IP>:8787` (phone and PC on the same Wi-Fi)
3. `cd mobile && npm install && npx expo start`, then scan the QR code with Expo Go

Leave `EXPO_PUBLIC_API_BASE` unset to use the live backend.

## Tests

```powershell
cd backend
npm test          # unit + Workers-runtime + end-to-end journeys (about 1,550 tests)
npx tsc --noEmit  # type check

cd ..\mobile
npx tsc --noEmit
```

The end-to-end journeys (`backend/tests/e2e`) build a real database from
`migrations/` and cover: sign up / log in, fixtures, results and league
table, Man of the Match voting, the news feed, video upload and playback,
and the security checks (forged tokens, self-made admins).

## Deploy to production

```powershell
cd backend
npm run db:migrate:prod     # apply any new migrations to the live database
npm run deploy:prod         # deploy the Worker
```

Back up first if a migration changes existing tables:
`npx wrangler d1 export syston-db --remote --env production --output backup.sql`

## Admin login

There is no password in this repo. Create or reset it with
`npm run admin:password:prod` (live) or `npm run admin:password` (local).
It asks for the password without showing it and stores only a bcrypt hash.

## Secrets (set with `npx wrangler secret put NAME --env production`)

| Name | Used for |
|---|---|
| `JWT_SECRET` | Signing login tokens. Changing it logs everyone out. |
| `BACKEND_API_KEY` | Passed to a club's Apps Script when it's provisioned |
| `GAS_HMAC_SECRET` | Signing calls from the Worker to Apps Script |
| `STRIPE_SECRET_KEY` | Shop checkout (optional until the shop is used) |
| `PRINTIFY_API_TOKEN` | Merch (optional) |

Never commit secret values. The old ones in git history were rotated on 23 Sep 2026.
