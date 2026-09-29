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
and YouTube tokens; `META_APP_SECRET` is needed to connect Facebook.
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (Web Push, `npm run push:keys:prod`) and
`YT_CLIENT_ID`/`YT_CLIENT_SECRET` (connecting YouTube) are optional until used. Plain vars in
`wrangler.toml`: `META_APP_ID`, `META_LOGIN_CONFIG_ID`, `APP_BASE_URL`.
`claude-ops/` and `*.bundle` are git-ignored because they can contain backups
with personal data.

## Known gaps (September 2026)

- Email isn't sent until `RESEND_API_KEY` and a verified sending domain are set;
  until then emails are only logged.
- Phone-app (Expo) push needs a real EAS project id (`npx eas init`); until
  then the phone app skips push registration. The installable web app uses Web
  Push and only needs the VAPID keys (`npm run push:keys:prod`).
- `GeoFenceManager` (Durable Object) is unused: it stored raw locations on the
  server. "At the match" is now worked out on the phone (see Match day).
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
- Undoing an update whose post already went out takes it down from the app
  and Facebook and queues a CORRECTION post (`correction` kind, score layout,
  source_id `correction:<eventId>`) with the corrected score, because
  Instagram posts can't be deleted. Goals, cards, half and full time only.
- Cron runs every minute for social posts, live stream detection and match
  alerts; the other scheduled jobs only run when `minute % 5 === 0`.
- Live video and match alerts: see `docs/MATCH_DAY_LIVE.md`. Alerts
  (`services/matchAlerts/`) go to everyone's devices except people at the
  match (`match_attendance`, yes/no only: phones compare their own location
  with the ground's) and whoever recorded the update, after the undo window.
  Video is a YouTube stream: pasted in Match Centre or found on the club's
  connected channel (`services/stream/`). Sending: `services/push/` (Web Push
  for the web app, Expo for the phone app); the old FCM sender is gone.

## Match highlights

- Match Centre's Chance, Save and Great play buttons (`chance`/`save`/`skill`
  events: no score, posts or alerts) mark moments; goals, their goals and
  cards are moments too. After the match, `GET /api/v1/fixtures/:id/highlights`
  (`routes/highlights.ts`, `services/highlights.ts`) turns each tap into a clip
  of the match's YouTube video (a window before and after the tap, per type).
  Nothing is downloaded or re-encoded, so it's free.
- The video is lined up by where kick-off is in it (`fixtures.video_kickoff_sec`):
  worked out from the stream's real start time when YouTube detection found
  it, otherwise staff pause on kick-off in the app. Staff set how many
  seconds each clip runs before and after its moment (0–120, `ClipTiming.tsx`,
  `PUT .../highlights {moment:{id,before,after}}`, stored as a shift from the
  type's default in `fixtures.highlight_edits`) or hide it.
- App: Highlights screen list, Live Match after full time, Match Centre after
  full time → `MatchHighlightsScreen`; clips play one after another
  (`components/highlights/ClipPlayer`, YouTube's player messages say when a
  clip ends). YouTube's rules don't allow downloading, so a video file for
  social media comes from the camera's own recording:
- "Make a video to post" (web app, staff; `MakeHighlightsVideo.web.tsx`): the
  manager picks the recording, shows where kick-off is, ticks the moments and
  the video is cut on their device by `services/highlightsVideo.ts`
  (mediabunny: reads the file in pieces, copies packets from each clip's key
  frame without re-encoding, joins them into an MP4). Nothing is uploaded.
  On a phone the recording is picked straight from Photos (the XbotGo app
  saves it there). With "Add the scoreboard and captions" (default) frames
  are decoded, drawn with `services/highlightsOverlay.ts` (title card,
  scoreboard with the score at each moment from `scoreBefore`/`scoreAfter`,
  captions near `tapAt`) and re-encoded with WebCodecs
  (`makeHighlightsVideoWithOverlays`); browsers without a video encoder get
  the plain cut. `node test/highlightsOverlay.test.js` checks the drawing.
  Clip times come from `momentsFromKickOff` (staff only, seconds from
  kick-off). mediabunny is only loaded when making a video (its own chunk).
  `node test/highlightsVideo.test.js some.mp4` cuts a real file.

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

## League table, fixtures and results from FA Full-Time

- FA Full-Time sits behind a Cloudflare bot check: servers (and curl) get a
  403 challenge. The old scraper that tried anyway was removed in September
  2026. Don't try to get around the check.
- Instead clubs paste the FA's official code snippets (Full-Time admin →
  Create Code Snippets) on the website's Settings → League Table & Fixtures
  page. The codes live in `tenants.fa_snippets` (`services/faFullTime.ts`,
  `routes/faFullTime.ts`; public: `/public/:club/fa-full-time`).
- The website (`components/FaFullTimeEmbed.tsx`) and app
  (`components/faFullTime/`) load the FA's `cs1.js` inside a sandboxed frame
  without same-origin, so the FA script can't read our tokens. The table page
  and app League screen show the FA table when set; Fixtures/Results show
  "Around the League". The website's frame reports what happened (FA
  unreachable, `cs1.html` blocked by the FA's security check, or loaded) so
  the card says why when it can't show the table.
- Our own results, scorers and points still come from Match Centre.
- FA fixture emails (new fixture, change, referee appointment, weekly
  reminder): staff paste the email on the website (Settings → League Table)
  or in the app (Manage Fixtures); `POST /api/v1/club/fixtures/fa-email`
  (`services/faEmail/`). `parse.ts` reads only the fixture lines
  ("Sun 20 Sept 2026 14:00, Home -v- Away Status: Normal", venue, the
  competition line above); referee and contact details are never stored.
  `apply.ts` adds new fixtures (`source = 'fa_email'`) and updates moved,
  postponed or cancelled ones, matched by `fixtures.fa_fixture_id` (from the
  email's link), else date + opponent, else the one unplayed match against
  that opponent at the same end. Our side is the League Table's team or the
  name closest to the club's.
- Automatic: each club has a private address `fixtures-<token>@EMAIL_DOMAIN`
  (`tenants.fixture_email_token`, `GET /api/v1/club/fixture-email`) and sets
  its inbox to forward FA Full-Time emails there. The Worker's `email()`
  handler (`services/faEmail/inbound.ts`, `mime.ts`) imports them, shows
  Gmail's forwarding confirmation code to staff and logs each email in
  `fixture_email_log` (90 days). Switching it on needs a domain on
  Cloudflare: set the `EMAIL_DOMAIN` var and an Email Routing catch-all rule
  that sends to the `app-production` Worker. Until then clubs paste.

## Our league table (sorted by goal difference)

- Leagues don't offer open data feeds (FA Full-Time, FAW COMET, GotSport and
  the rest), so the club's table is worked out by us (`services/league/`):
  managers paste the league's results page, or its table, copied from any
  site (Settings → League Table; `POST /api/v1/club/league/paste`).
  `parse.ts` reads tab/space separated rows, dd/mm and US m/d dates and date
  headings; postponed games are skipped. Results are kept in `league_results`
  (repeat pastes are ignored) and settings in `league_settings`.
- `store.ts` rebuilds `league_standings` from the season's results plus our
  Match Centre/manual results on days the paste doesn't cover, sorted by
  points, goal difference, goals scored (`table.ts`). It runs after each
  paste, full time, undo and result edit. A pasted table is re-sorted instead
  (`mode = 'table'`) and isn't touched by later results until the next paste.
- The website, app and weekly table graphic all read `league_standings`;
  `/public/:club/table` returns `meta.source` so pages can say how it's sorted.

## Photo and video consent

- `squad.photo_consent` / `video_consent` (1 yes, 0 no, NULL not asked =
  no), set by a linked parent in the app (Photo & Video Consent screen, home
  prompt until answered) or by staff from a paper form
  (`GET /api/v1/consent`, `PUT /api/v1/players/:id/consent`,
  `services/consent.ts`).
- Parents link their account to their child with a code from staff
  (`POST /api/v1/players/:id/parent-invite`, `POST /api/v1/link-child`,
  `services/parentLinks.ts`): 8 characters, stored hashed, 30 days, 4 uses,
  a new code replaces the old; the shared link `?club=<slug>&link=<code>`
  prefills it. Staff see and remove links (`/players/:id/parents`). The old
  `auth/link-player` (short player codes) is rate limited.
- Parents with an unanswered child get one push reminder, then one more a
  week later (`services/consentReminders.ts`, 5-minute cron, 9am-7pm UK,
  claimed in `consent_reminders`); the tap opens the consent screen.
- Anything public reads photos through `publicPhotoSql()`: club page squad,
  MOTM, and every social graphic, on top of the club's `public_photos`.
- Staff are warned about video: line-up editor and `GET .../lineup`
  (`noVideoConsent`), highlight clips (`noVideoConsent` per moment; the video
  maker leaves those clips unticked).
- Match Centre also has Their yellow / Their red (`opp_yellow`, `opp_red`):
  timeline only, no stats, posts or alerts.

## App look (brand)

- Brand: the Boost Huddle hexagon emblem (`assets/emblem.png`, cut out of the
  logo), dark ink `#06080B`, cyan glow `#19E3FF`; club screens use the club's
  colour (`theme.colors.primary`). Display type is Barlow Condensed
  (`assets/fonts`, OFL, `theme/brandFonts.ts`); body text is the system font.
- `components/brand/Backdrop.tsx` draws the hex grid, circuit traces and glow
  (react-native-svg), used by the launch screen, home header and menu.
- Launch: `web/boot.html` is shown by the page while the code loads, then
  `BrandSplash` (at least 1.2s, until fonts load); iPhones get full-screen
  launch images (`web/splash`, regenerate with `node scripts/make-splash.mjs`
  after changing `boot.html`). Android always shows its own small icon first;
  the manifest's "any" icons are the cut-out emblem so there's no square box.
- Home (`screens/HomeScreen.tsx`, `components/home/`): header with crest,
  live cards, next match, league snapshot, quick links, latest feed. The menu
  (`CustomDrawerContent.tsx`) shows every section open, staff zone boxed.

## Owner panel

- Website `/owner` (`web-app/src/app/owner`, `components/owner`, `lib/owner`)
  for Boost Huddle staff: overview, clubs (search, status filter, detail),
  members search by email, money (plans, trial pipeline, `platform_revenue`)
  and history. Backend: `routes/owner.ts`, `services/owner/*`,
  `services/ownerAuth.ts` (`/api/v1/owner/*`).
- Owners are in `platform_owners`, created with `npm run owner:create[:prod]`
  (never through the API). Sign-in gives a 12-hour token (roles `admin`,
  `platform_owner`) kept in an HttpOnly, SameSite=Strict cookie scoped to
  `/api/owner`; the website's `/api/owner/[...path]` forwards only the panel's
  own calls (`lib/owner/proxy.ts`).
- Actions (`services/owner/actions.ts`): extend trial, set plan, free access
  (`comped`), premium graphics unlocks, suspend (club login refused with
  `CLUB_SUSPENDED` and every session revoked) and reactivate. Each is written
  to `owner_audit`. Only "reactivate" lifts a suspension.
- The old consoles (`owner-admin/`, `admin/`, the website's root `/admin`,
  `/api/v1/admin/tenants|promo-codes|stats|users`, magic links, `/dev/*`,
  `/owner-api/*`) were removed in September 2026.

## Access rules worth knowing

- Club-admin writes are wrapped in `staffOnly(...)` in `index.ts`; add new
  admin routes the same way.
- CORS: only our own sites (plus `CORS_ALLOWED`) may call the API from a
  browser; never add wildcards or domains we don't own.
- Player records: staff see everything; other members get the team-sheet view
  (`services/playerPrivacy.ts`) unless linked to that player.
