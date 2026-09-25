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
| `mobile/` | Expo SDK 54 app for players, parents and coaches. Multi-club: the current club lives in `src/services/club.ts` (`getTenantId()`); never hardcode a club |
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
`SOCIAL_TOKEN_KEY` (32 random bytes, base64) encrypts clubs' Facebook/Instagram
tokens; `META_APP_SECRET` is needed to connect them. Plain vars in
`wrangler.toml`: `META_APP_ID`, `META_LOGIN_CONFIG_ID`, `APP_BASE_URL`.
`claude-ops/` and `*.bundle` are git-ignored because they can contain backups
with personal data.

## Known gaps (September 2026)

- Email isn't sent until `RESEND_API_KEY` and a verified sending domain are set;
  until then emails are only logged.
- Mobile push notifications need a real EAS project id (`npx eas init`); until
  then the app skips push registration.
- Privacy policy and terms: drafts awaiting legal review are in `legal-docs/drafts/`; the
  live pages (`legal-docs/*.html`) are older and should be replaced once the
  drafts are approved.
- `web-app` `npm run lint` fails: Next 16 removed `next lint`. Use `npx tsc --noEmit`.

## Match day

- Live match updates: staff use Match Centre in the app (`LiveMatchInputScreen`),
  everyone follows on Live Match and the home banner, and the public club page
  shows the score (`/public/:club/live`). Backend: `routes/liveMatch.ts`; the
  score and clock are worked out from `live_match_events`
  (`services/liveMatchState.ts`), so Undo fixes everything.
- Full time saves the result (`team_results.fixture_id`), league points and
  players' goals/assists/cards (`match_events` ids starting `live-`), and marks
  the fixture completed. Undoing full time takes them back out.
- Each tap sends `occurredAt` (the phone's time, trusted within 15 minutes), so
  kick-off, half time and goals line up with match footage later.
- Line-ups: `routes/lineup.ts` (5/7/9/11-a-side; club `default_team_size`,
  fixture `team_size`). "Post team news" queues a line-up post.
- Man of the Match: nominees default to everyone who played (starters plus subs
  who came on, `playersWhoPlayed`); full time opens a 48h vote automatically
  when a line-up exists. Closing the vote queues the winner post.
- Automatic posts: `services/social/` builds the caption and a `Graphic`
  (`services/graphics/types.ts`), applying the club's name style (full /
  `first_initial` / `initial_last` / `first` / `last`; managers can change it)
  and showing photos only if `public_photos`. `social_jobs` wait for the undo
  window (60s, per club) and the once-a-minute cron (`processDueJobs`) draws
  any missing graphic and posts to the club feed, Facebook and Instagram.
  Which events go where is set per club in the website's admin settings.
  TikTok needs TikTok's app review first; until then managers use Share.
- A scorer's 2nd, 3rd, 4th... goal in a match posts as BRACE! / HAT-TRICK! /
  FOUR GOALS! (`goalMilestone`); the graphic shows one ball per goal and turns
  gold from a hat-trick.
- Cron runs every minute for social posts; the other scheduled jobs only run
  when `minute % 5 === 0`.

## Social graphics and club posts

- The server draws every graphic (`services/graphics/`): SVG layouts in a
  design pack, rendered to JPEG by resvg (WASM, `resvg.wasm` is a copy of the
  npm package's file; refresh with `npm run graphics:wasm`) with bundled OFL
  fonts (`fonts/`, widths in `fonts/metrics.ts` from `scripts/font-metrics.py`).
  `npm run graphics:preview -- <dir>` draws every layout in every pack.
- Packs: Touchline and Floodlights (free, small "Made with Boost Huddle"
  credit) and Elite (premium, unlocked per club in `graphics_unlocks` via
  `PUT /api/v1/admin/tenants/:id/graphics/:pack`; no purchase flow until Stripe
  is live). Clubs pick a pack and sponsor in the website's admin settings.
- Opponent badges come from the website's Opponents page (`opponent_teams`);
  opponents are added there automatically when a post mentions them. PNG/JPG
  only: the renderer can't draw WebP or SVG (initials are shown instead).
- Scheduled club posts (`services/social/scheduler.ts`, 5-minute cron, UK time):
  countdown, match day, postponed, weekly fixtures/results, league table,
  birthdays (club app only, no age), player of the week/month, milestones,
  throwback (public only if the club allows player photos) and quotes. Each
  has a unique `source_id`, so running twice never posts twice.
- End-to-end tests set `SOCIAL_BACKGROUND_DRAWING=off` and draw/post
  explicitly; the Workers test runner can't cope with WASM work left running.

## Access rules worth knowing

- Club-admin writes are wrapped in `staffOnly(...)` in `index.ts`; add new
  admin routes the same way.
- CORS: only our own sites (plus `CORS_ALLOWED`) may call the API from a
  browser; never add wildcards or domains we don't own.
- Player records: staff see everything; other members get the team-sheet view
  (`services/playerPrivacy.ts`) unless linked to that player.
