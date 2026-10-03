# Start here

Everything below was checked against the code in October 2026. If another
doc disagrees with this one, trust this one (and the code).

Read next: `CLAUDE.md` (how each feature works), `docs/CONVENTIONS.md` (how
code is written here), `docs/ROADMAP.md` (what's next).

## What's live

| Piece | Where |
|---|---|
| Backend API (Cloudflare Worker) | `app-production` → https://app-production.team-platform-2025.workers.dev |
| Database | D1 `syston-db` (binding `DB`), schema from `backend/migrations/` |
| Website + club sign-up (`web-app/`) | `boost-huddle` Worker → https://boost-huddle.team-platform-2025.workers.dev |
| Web app (installable, no app store) | `boost-huddle-app` Worker → https://boost-huddle-app.team-platform-2025.workers.dev (built from `mobile/`) |
| Club | slug `syston-tigers` |
| Mobile app | `mobile/` (Expo SDK 54, "Boost Huddle"). One app for every club: people find their club on first launch |

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

Leave `EXPO_PUBLIC_API_BASE` unset to use the live backend. Leave
`EXPO_PUBLIC_TENANT_ID` empty for the multi-club app, or set it to a club's web
address (e.g. `syston-tigers`) to build an app locked to that club.

Before the first store build: run `npx eas init` in `mobile/` (needs a free
Expo account). It replaces the `dev-placeholder` project id in `app.json`,
which push notifications need.

## Tests

```powershell
cd backend
npm test          # unit + Workers-runtime + end-to-end journeys (about 1,500 tests)
npx tsc --noEmit  # type check

cd ..\mobile
npx tsc --noEmit
npm test          # the app's helper tests

cd ..\web-app
npx tsc --noEmit
```

The end-to-end journeys (`backend/tests/e2e`, one per flow; see its README)
build a real database from `migrations/` and cover sign-up, Match Centre,
posts, highlights, league table, results and scorers, player pages, drills,
consent, the owner panel and the security checks (forged tokens, self-made
admins, members refused staff actions). `src/__tests__/tenantGuard.test.ts`
fails if a new query on club data has no `tenant_id` filter.

To look at the app in a browser against a local backend: run the backend as
above, then in `mobile/` run `EXPO_PUBLIC_API_BASE=http://127.0.0.1:8787 npx
expo export --platform web` and serve `dist/` (any static server that falls
back to `index.html`), and set `CORS_ALLOWED` on `wrangler dev` to that
address.

## How deploys are done today

The owner deploys from his Windows PC with numbered scripts in
`C:\dev\app-FRESH\claude-ops\` (git-ignored). For each release the
assistant prepares, in that folder:

- `syston-fixes-<n>.bundle`: the new commits (`git bundle create ... origin/main..main`),
- `app-web-<n>.zip`: `dist/` + `wrangler.web.jsonc` from `mobile/` (`node scripts/build-web.mjs`
  with `EXPO_PUBLIC_API_BASE` unset, so it uses the live API),
- `web-site-<n>.zip`: `.open-next/` + `wrangler.jsonc` from `web-app/`
  (`npx opennextjs-cloudflare build` with `NEXT_PUBLIC_API_BASE` unset),
- `<n>-deploy-<what>.bat`: fetches the bundle and fast-forwards `main`, type
  checks, **backs up the live database**, applies migrations, deploys the
  Worker, the web app and the website, runs a few `curl` smoke checks, then
  pushes `main` to GitHub. Its output goes to `deploy-<n>.log` in the same
  folder, which the assistant reads afterwards.

Copy the newest `.bat` as the template; only the numbers, the bundle/zip
names and the smoke checks change.

## Deploy to production by hand

```powershell
cd backend
npm run db:migrate:prod     # apply any new migrations to the live database
npm run deploy:prod         # deploy the Worker
```

Back up first if a migration changes existing tables:
`npx wrangler d1 export syston-db --remote --env production --output backup.sql`

## Deploy the website

```powershell
cd web-app
npm run cf:deploy     # builds with OpenNext and deploys the boost-huddle Worker
```

New clubs sign up at `/create-team`: they get a 14-day free trial (no card)
and land in their dashboard at `/<club-url>/admin`.

## Deploy the installable web app

```powershell
cd mobile
npm run web:deploy    # builds the app for the web (scripts/build-web.mjs) and deploys boost-huddle-app
```

Share a club's link as `https://boost-huddle-app.team-platform-2025.workers.dev/?club=<club-url>`;
the club dashboard's "Copy app link" does this for owners.

## Payments

Billing switches on when these are set on `app-production`:
secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; vars
`STRIPE_STARTER_MONTHLY_PRICE_ID`, `STRIPE_PRO_MONTHLY_PRICE_ID`. Point the Stripe
webhook at `https://app-production.team-platform-2025.workers.dev/webhooks/stripe`.
Plan names, prices shown and features live in `backend/src/routes/billing.ts` (PLANS).

## Admin login

There is no password in this repo. Create or reset it with
`npm run admin:password:prod` (live) or `npm run admin:password` (local).
It asks for the password without showing it and stores only a bcrypt hash.

## Owner panel (Boost Huddle staff)

The website's `/owner` pages show every club, its plan, trial, members and
activity, and let you extend trials, change plan, give free access, unlock
premium graphics, and suspend or reactivate a club. Create your owner login
with `npm run owner:create:prod` (live) or `npm run owner:create` (local)
from `backend/`: it asks for your email and a password (hidden) and stores
only a bcrypt hash. Run it again to change the password.

## Secrets (set with `npx wrangler secret put NAME --env production`)

| Name | Used for |
|---|---|
| `JWT_SECRET` | Signing login tokens. Changing it logs everyone out. |
| `RESEND_API_KEY` | Sending email (sign-up checks, invites). Until set, emails are only logged |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Club subscriptions and the shop (optional until payments are switched on) |
| `SOCIAL_TOKEN_KEY` | Encrypts clubs' Facebook/Instagram/YouTube tokens (32 random bytes, base64) |
| `META_APP_SECRET` | Connecting Facebook and Instagram (with `META_APP_ID` in `wrangler.toml`) |
| `PRINTIFY_API_TOKEN` | Merch (optional) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Match alerts in the web app. Create once with `npm run push:keys:prod` |
| `YT_CLIENT_ID`, `YT_CLIENT_SECRET` | Clubs connecting YouTube so live streams show in the app (optional; see `docs/MATCH_DAY_LIVE.md`) |

Never commit secret values. The old ones in git history were rotated on 23 Sep 2026.
