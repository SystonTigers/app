# Boost Huddle (Syston Tigers is the first club): guide for developers and AI assistants

Read `START_HERE.md` first: it covers running, testing and deploying. Then
`docs/CONVENTIONS.md` (how code is written here) and `docs/ROADMAP.md`
(what's next). For any screen or page, use the project skills in
`.claude/skills/`: `boost-huddle-design` (the look and the words),
`interface-checklist` (what to check before finishing) and `browser-check`
(`cd mobile && npm run browser-check`: signs in on a local test copy and
screenshots each screen at phone size). Other AI tools read `AGENTS.md`, which points to the same files.
The code is the source of truth; old plans and status reports are in
`archive/` for history only. When a doc disagrees with the code, trust the
code, and fix the doc. Checked against the code on 6 October 2026.

## What this is

A multi-club grassroots football app. One Cloudflare Worker serves every club
(tenant); each club's data is keyed by `tenant_id` in one D1 database.

| Folder | What it is |
|---|---|
| `backend/` | Cloudflare Worker API (TypeScript, Wrangler). Live as `app-production`. |
| `backend/migrations/` | D1 schema (`0001_baseline.sql` onwards; `archive/` is history only) |
| `mobile/` | Expo SDK 54 app for players, parents and coaches. Multi-club: the current club lives in `src/services/club.ts` (`getTenantId()`); never hardcode a club |
| `web-app/` | Next.js site: landing page, club sign-up (`/create-team`), club pages and dashboards. Live as the `boost-huddle` Worker (OpenNext) |
| `video-processing/` | Older Python highlights tools, not used by the app (see its README) |

There is no Google Apps Script or Google Sheets in the system any more. New
clubs sign up on `web-app` at `/create-team`, which registers the owner on the
Worker, sends a verification email and then saves the club's details.

## Backend conventions

- Routing is in `backend/src/index.ts`; handlers live in `backend/src/routes/`.
- Auth: `services/auth.ts` – `requireJWT`, `requireTenantJWT`, `requireStaff`,
  `hasAnyRole`. Tokens are HS256 JWTs signed with `JWT_SECRET`.
- Every query that reads or writes club data must filter by `tenant_id`.
  `src/__tests__/tenantGuard.test.ts` enforces it; older exceptions under
  review are in `tests/tenant-guard-baseline.json` (only ever shrink it).
- Roles are never taken from a client request; admins are created with
  `npm run admin:password[:prod]`.
- Storage: D1 `DB` (data), R2 `R2_MEDIA` (photos, badges, graphics), KV (cache,
  idempotency, rate limits), queues for background work. No Durable Objects
  (the old ones were deleted in October 2026, `wrangler.toml` migration v6;
  never reuse their class names).
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

## Known gaps (October 2026; the full list is `docs/ROADMAP.md`)

- Email isn't sent until `RESEND_API_KEY` and a verified sending domain are set;
  until then emails are only logged.
- Phone-app (Expo) push needs a real EAS project id (`npx eas init`); until
  then the phone app skips push registration. The installable web app uses Web
  Push and only needs the VAPID keys (`npm run push:keys:prod`).
- Privacy policy and terms: drafts awaiting legal review are in `legal-docs/drafts/`; the
  live pages (`legal-docs/*.html`) are older and should be replaced once the
  drafts are approved.
- `web-app` `npm run lint` fails: Next 16 removed `next lint`. Use `npx tsc --noEmit`.
- When a club's free trial ends nothing changes yet: `TRIAL_END_MODE` (wrangler
  var) is "off". Set it to "read_only" once pricing is decided: staff changes
  then get 402 `TRIAL_ENDED` until the club pays or is given free access;
  reading, families' actions, sign-in, billing and the owner panel still work
  (`services/trialLock.ts`, gate in `index.ts` fetch; `GET /billing/status`
  returns `readOnly` for the website banner).

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
- Man of the Match: at full time the manager's phone pops up
  `components/motm/FullTimeMotmSheet` with everyone who played ticked
  (`GET /api/v1/motm/:id` gives staff `suggested` from `playersWhoPlayed`;
  the whole squad if there was no line-up). They untick anyone who didn't
  play, pick 2/3/4 hours or a custom time (up to 3 days) and open voting.
  Opening a vote that starts now queues a `motm` alert to everyone at the
  club (people at the match too; `queueMotmAlert`, one per opening), which
  opens the vote screen. Closing the vote queues the winner post.
- Automatic posts: `services/social/` builds the caption and a `Graphic`
  (`services/graphics/types.ts`), applying the club's name style (full /
  `first_initial` / `initial_last` / `first` / `last`; managers can change it)
  and showing photos only if `public_photos`. `social_jobs` wait for the undo
  window (60s, per club) and the once-a-minute cron (`processDueJobs`) draws
  any missing graphic and posts to the club feed, Facebook and Instagram.
  Which events go where is set per club in Club Settings (app: Manager Zone →
  Club Settings, `ClubSettingsScreen`; website: Admin → Settings). Connecting
  Facebook from the app passes `from: "app"`; the callback then shows a "go back
  to the app" page and parks any Page choice in KV (`metaAppReturn.ts`).
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
- The website's old video uploader (upload a file to R2, hand-marked clips,
  the "AI assistant coach" and `/api/v1/videos*`, `/api/v1/coaching/*`) was
  removed in October 2026. Its `videos` and `video_clips` tables are left in
  the database unused; files it stored under `videos/` in R2 still play where
  a Team Talk conversation links one.

## Goal of the Month

- Staff run it in the app (Manager Zone → Goal of the Month,
  `ManageGotmScreen`) or on the website (Admin → Goal of the Month): pick a month
  (defaults to last month), tick 2 to 10 of the month's goals from Match
  Centre and match reports (`GET /api/v1/gotm/goals?month=YYYY-MM`; ones with
  a match clip are marked) or type goals in with an optional video link, then
  open voting (`POST /gotm/start`; one open vote at a time). Members watch
  the clips and vote once in the app (Highlights → Goal of the Month,
  `components/gotm/GotmPanel`; `POST /gotm/vote`, a unique index stops double
  votes). Counts are hidden from members until it closes; staff see them.
- Closing (`POST /gotm/close`) picks the winner (joint winners share it) and
  queues one `gotm` post (`source_id gotm:<votingId>`, person layout; set in
  Club Settings). `GET /gotm` returns the open vote with my vote and the last
  six winners. Code: `routes/gotm.ts`, `services/gotm/` (`rules.ts` pure,
  `store.ts` database); nominations point at their goal (`event_id`,
  migration 0026) so clips come from the same helper as player pages
  (`playerProfile/clips.ts` `fixtureGoalClips`), with video consent applied.

## Social graphics and club posts

- The server draws every graphic (`services/graphics/`): SVG layouts in a
  design pack, rendered to JPEG by resvg (WASM, `resvg.wasm` is a copy of the
  npm package's file; refresh with `npm run graphics:wasm`) with bundled OFL
  fonts (`fonts/`, widths in `fonts/metrics.ts` from `scripts/font-metrics.py`).
  `npm run graphics:preview -- <dir>` draws every layout in every pack.
- Matchday (`studio/`, `pack.studio`): layouts rebuilt from the club's Canva
  set (bold posters with dry-brush strokes, torn edges, halftone dots and a
  crest watermark; a drawn floodlit stadium for match day, kick-off,
  countdown, line-ups and quotes). Everything takes the club's own colours
  (`clubColours`) and crest, goals show the scorer's shirt number
  (`shirtNumber`, from `squad.number`), and photos are duotoned in the
  club's colours. Brushes and torn edges are drawn as shapes, not filters, so
  each post renders in about a second. `npx tsx scripts/studio-dev.ts <dir>
  [photo.jpg]` draws every layout for three clubs, as posts and stories.
- Packs: Touchline and Floodlights (free, small "Made with Boost Huddle"
  credit) and Elite (premium: included with Pro, otherwise unlocked per club
  in `graphics_unlocks` from the owner panel; no purchase flow until Stripe
  is live). Clubs pick a pack and sponsor in Club Settings (app or website).
- The club badge is uploaded in Club Settings (`POST /api/v1/club/badge`,
  PNG/JPG under 3 MB, `tenant_brand.badge_url`); graphics, the app and club
  pages all read it from there.
- Opponent badges come from the Opponents page (website Admin → Opponents,
  app Manager Zone → Opponents `OpponentsScreen`; `opponent_teams`; the
  upload takes the picture as the body or a form field `badge`);
  opponents are added there automatically when a post mentions them. PNG/JPG
  only: the renderer can't draw WebP or SVG (initials are shown instead).
- Scheduled club posts (`services/social/scheduler.ts`, 5-minute cron, UK time):
  countdown, match day, postponed, weekly fixtures/results, league table,
  birthdays (club app only, no age), player of the week/month, milestones,
  throwback (only gallery photos staff ticked "Throwback Thursday", 6+ months
  old, and public only if the club allows player photos) and quotes. Each
  has a unique `source_id`, so running twice never posts twice.
- Monthly round-ups on the 1st (`services/social/roundups.ts`): last month's
  results 11:00 (`month_results:<yyyy-mm>`), the season's top scorers 12:00
  (`stats_roundup`, `leaders` graphic: goals, assists, apps; joint places
  share a rank; names in the club's style) and this month's fixtures 17:00
  (`month_fixtures`). Nothing posts for an empty month or a season with no
  goals. The queries they share with the weekly posts are in `scheduleData.ts`.
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
  and app League screen show the FA table when the club has no table of its
  own. Fixtures/Results (website pages, app Matches tab and Results screen)
  show the club's `team` snippet as "Our fixtures and results" until it has
  added matches of its own, and the league's fixtures/results snippets as
  "Around the league" (app: `components/faFullTime/FaSnippetCard`,
  `useFaSnippets`). The FA's snippets only cover the season happening now,
  so they're hidden under a past season's tab (`showsFaSnippets` in the app,
  `PublicSeasonTabs`' `isCurrent` on the website). The website's frame reports what happened (FA
  unreachable, `cs1.html` blocked by the FA's security check, or loaded) so
  the card says why when it can't show the table.
- Our own results, scorers and points come from Match Centre, match reports
  and results staff add (see Results).
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
- From a photo or screenshot (app: Manage Fixtures → Add fixture → "Fill in
  from a photo"; `components/fixtures/FixturePhotoReader.tsx`): the picture
  is shrunk on the phone and read by Workers AI's vision model
  (`services/fixtureImage/`, `[env.production.ai]` binding, model
  `FIXTURE_IMAGE_MODEL` or `@cf/meta/llama-3.2-11b-vision-instruct`; Meta's
  licence is accepted automatically on first use). Nothing is saved or kept:
  `POST /api/v1/club/fixtures/from-image` returns the fixtures for staff to
  check (one fills the form, several are ticked) and
  `POST .../from-image/apply` adds them through the FA email import
  (`source = 'photo'`, no duplicates). 40 pictures per club per day. The
  website's Fixtures admin has the same reader (`components/FixturePhotoImport.tsx`). The local
  test runner has no AI binding, so locally it says it isn't switched on.
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
  site (website Settings → League Table, app Club Settings → League table
  `LeagueTableCard`; `POST /api/v1/club/league/paste`).
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
- `GET /api/v1/league/snapshot` (members, `services/league/snapshot.ts`): our
  row with the teams around us (app Home: `LeagueStrip`) and, while one of our
  league games is live or at half time, `live.rows`: the table "as it stands"
  with the live score counted (`live.ts`, nothing saved; full time saves it).
  League games are fixtures with no competition, "League" or the table's own
  competition name. Live Match shows the whole live table; Home refreshes
  every 30 s during a match.

## Player pages

- Players tab (`SquadScreen`) → `PlayerScreen` (`GET /api/v1/players/:id/profile`,
  `routes/playerProfile.ts`, `services/playerProfile/`): bio, all-time and
  per-season stats (`services/squadStats.ts`, shared with the Stats screen),
  photos (`player_images` plus gallery photos they're tagged in) and goal clips (Match Centre goal taps in matches
  with a lined-up YouTube video, same clips as Highlights, hidden ones left out).
- The top of the page shows this season's apps, goals, assists and MOTM and,
  once they've played more than one season, the career totals "Since
  2017/18 · 10 seasons" (first season with any stats; `headlineRows` in
  `utils/playerPage.ts`). Past seasons come from Match Centre, match reports,
  uploaded or added results (goals) and Manage Squad → Season stats (apps,
  assists, MOTM for years before the app).
- Only the player writes their bio (`PUT /players/:id/bio`): an account with
  the `player` role linked to that squad entry (`auth_user_players`, linked
  with the manager's code). Staff can only remove a bio. Bios can't contain
  links, emails, phone numbers or social media names (`playerProfile/bio.ts`).
- Photos and clips show to staff and the player's family always, and to
  other members only with `photo_consent` / `video_consent` = 1.
- `GET /api/v1/me/players`: players linked to my account (`isMe` for players).

## Drills

- The app's Drill Library mixes the built-in drills (`mobile/src/data/drillsData.ts`,
  with set-up, steps, coaching points and progressions in `drillDetails.ts`)
  and the club's own (`training_drills`, `routes/drills.ts`). Drills are
  referenced as `lib:<id>` or `club:<id>` everywhere (session plans too).
- `GET /api/v1/training/drills` (members) returns the club drills plus my
  `favourites` (per person, `drill_favourites`) and video `links` by ref.
  Staff create/edit/remove club drills (or "Make our version" of a built-in
  one) and add TikTok/Instagram/YouTube links (`drill_links`). Only links are
  kept; videos open on those sites. TikTok and YouTube previews come from their
  public oEmbed and the picture is copied to R2 (`drills/<tenant>/links/`);
  Instagram oEmbed needs a Meta token, so it shows without a picture.
  `LINK_PREVIEWS=off` skips the lookups (tests).
- App: `DrillLibraryScreen` (All / Favourites / Our drills), `DrillScreen`
  (one drill), shared state in `services/drillsStore.ts`.

## Results, seasons and gallery

- Seasons are football years (1 Aug to 31 Jul, id `2025-26`) unless the club
  has rows in `seasons` (`services/seasons/range.ts`); then its own seasons
  come first and the football years before the first one stay
  (`withClubSeasons`), so starting a season never hides older history.
- Season admin (app Manager Zone → Seasons, `ManageSeasonsScreen`; website
  Admin → Seasons): start a season (carry the squad over), end it with awards,
  make another current, reopen within a day. The end of season review and
  snapshots use the season's dates (`services/seasons/review.ts`), not the
  old per-row `season_id`; awards are read in the app's or website's shape
  (`readAwards`). `GET /api/v1/results/seasons`
  lists them; `?season=` filters `GET /results` and `GET /stats/players`.
- App Results screen (menu: Results, and Manage Results for managers): season
  chips (`components/seasons/SeasonPicker`), summary, and staff add/edit/remove
  (`routes/results.ts`, `POST/PUT /api/v1/results`) for any past date, so old
  seasons can be filled in. Stats has the same season chips.
- Spreadsheet upload (app Results screen → Upload spreadsheet, or Import data →
  Match results; `POST /api/v1/results/import`, staff; `?preview=1` saves
  nothing): Excel .xlsx (every sheet, read without a library by
  `services/resultsImport/sheet.ts`) or CSV. `columns.ts` works out the
  columns from header names and cell contents (date, opponent or home/away
  team names, H/A, score as "3-1"/"W 3-1" or for/against or home/away scores,
  competition, venue, scorers), UK or US dates, Excel day numbers and
  year-less dates from a sheet named like "2024-25". `rows.ts` reads scorers
  ("Smith 2, J. Brown x2, OG") and matches them to the squad (full name,
  unique surname, initial + surname, unique first name; never a guess).
  `store.ts` adds rows as `source = 'import'` with goals as `res-<id>-<n>`
  events; rows already in the app from anywhere else are never changed, and
  uploading again only updates earlier imports, so adding an old player to
  the squad and re-uploading fills in their goals. The old CSV route
  `/api/v1/import/results` uses the same code.
- Head to head (`GET /api/v1/results/head-to-head?opponent=`, members,
  `services/headToHead.ts`): our record and last five scores against a team.
  `sameOpponent` ignores age groups and FC/Juniors and lets one name be the
  other plus a side's suffix, so the FA's "Thurmaston Magpies U18 Thunder"
  matches a spreadsheet's "Thurmaston Magpies" but not "... Lightning". The
  app's Home shows it under the next match (`components/home/HeadToHead.tsx`).
- Scorers on added results are picked from the squad (app
  `ResultFormModal` with `PlayerPicker`, website results admin): `scorerIds`
  (one squad id per goal) and `ownGoals`. They're saved as `match_events`
  goals with ids `res-<resultId>-<n>` (`services/resultGoals.ts`), tied to the
  fixture if the result has one, else to the result id, so they count in
  stats and player pages; the `scorers` line ("Pat Player 2, OG") is written
  from them and deleting the result removes them. `GET /results` returns
  `scorerIds`, `ownGoals` and `scorersFrom` (`match_centre` = locked, edit in
  Match Centre; `picked`; `typed` = old free text that counts for nothing).
- Gallery (`routes/gallery.ts`, app `GalleryScreen`, menu: My Club → Gallery):
  members-only albums (match / training / days out / throwback) grouped by
  season. Staff make, rename and remove albums (removing one removes its
  photos and R2 files) and upload several photos at once after confirming
  consent. Photos record the uploader's account id; members see a name, never
  an email.
- Staff tag who's in a photo (app photo viewer → Tag players;
  `PUT /api/v1/gallery/photos/:id/players {playerIds}`, `photo_players`,
  migration 0027, `services/galleryTags.ts`). Photo lists return `players`;
  members tap a name to open that player's page. Tagged photos join the
  player's own photos on their page (type `gallery`, id `gallery:<photoId>`)
  under the same photo consent rule. Removing a photo or album removes its tags.
- App navigation: a back arrow sits next to the menu button, the drawer goes
  back through history, and the web app has real URLs (`navigation/linking.ts`)
  so the phone's back gesture returns to the last page instead of closing it.

## Squad, roles and training

- Players have `first_name` and `last_name` (migration 0025); `name` stays the
  full name for everything that reads it. Forms send `firstName`/`lastName`
  (or a single `name`, split at the first space: `services/playerNames.ts`,
  matched by `mobile/src/utils/playerNames.ts` and `web-app/src/lib/playerNames.ts`).
  CSV import takes `first_name,last_name` (or `name`). `getPublicNamePolicy`
  loads the club's names so name styles split "Mary Jane" + "Watson" or
  "Virgil" + "Van Dijk" correctly; players saved before the split use the
  first and last word until staff save them again.
- Player stats are counted from Match Centre and match reports
  (`match_events`, line-ups); staff add numbers for past seasons by hand
  (Manage Squad → Season stats; `player_stat_entries`,
  `routes/playerStatEntries.ts`, `PUT /api/v1/players/:id/season-stats/:season`),
  added on top in `GET /stats/players`. Seasons always offer at least three
  past football years.
- Match reports (website fixtures admin → Report; app Manage Fixtures →
  Report on a past match, `MatchReportScreen`, `utils/matchReport.ts`;
  `POST /api/v1/matches/:id/report`) take the score, starters and subs and
  each goal, assist, card, sub and MOTM; starters and subs who came on count
  as appearances. Saving replaces the match's events (Match Centre's too: the
  app warns when the match was recorded there), saves the result with
  scorers' names and rebuilds the league table.
- Sign-up: new accounts wait to be let in (roles `["pending"]`,
  `profile.joinAs` = what they chose; `rolesForSignUp`). Staff get an in-app
  notification and push, and approve or turn them away in People & Roles
  ("Waiting to join"; `POST /api/v1/club/members/:id/approve|decline`).
  Approving gives the chosen role; Coach becomes a Supporter with a pending
  coach request (`profile.pendingRole`). A parent's code from staff
  (`link-child`) lets a waiting account straight in and returns a new token
  (`letIn`). Until then `services/membershipGate.ts` refuses everything but
  sign-in, profile, push, `link-child` and `GET /membership` with 403
  `WAITING_FOR_APPROVAL`; the app shows `WaitingForApprovalScreen`, which
  polls `GET /api/v1/membership` (it hands back a member token once let in).
  Nobody can make themselves staff. Supporters see what parents see, without children.
- Match details are members only: signed out (or still waiting),
  `/public/:club/fixtures` gives no upcoming games (`meta.membersOnly`),
  `fixtures/next` is null, `live` is empty, an unplayed fixture is 404, the
  FA snippets leave out `fixtures`/`team`, and the public feed leaves out
  posts that show grounds or times (`MATCH_DETAIL_KINDS` in `routes/public.ts`)
  unless the club hides those in posts. Results stay public. The website
  sends the sign-in (`apiFetch`; home page `components/HomeFixtures.tsx`).
- Club Settings → What gets posted → "Leave the ground and kick-off time out
  of posts" (`tenants.social_hide_match_details`, migration 0029, off by
  default; `PUT /social/settings {hideMatchDetails}`): `forPosting()` in
  `services/social/club.ts` blanks them for match day, countdown, postponed,
  fixture lists, team news and kick-off posts.
  App staff checks use `utils/roles.ts` (`isStaffRole`, `menuRole`).
- Training Centre (`TrainingScreen`, `routes/trainingSessions.ts`): staff plan
  sessions (date, time, place, focus, drills as `lib:<id>`/`club:<id>` refs in
  `training_plans.drill_refs`) and take the register (`training_attendance`);
  drill of the week rotates through the built-in library each Monday.

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

## Discipline, clock and minutes

- A player's second yellow shows as "Second yellow, sent off" (red icon), posts
  as SECOND YELLOW with a red card, and at full time saves the yellow plus a
  red (`live-<id>-red`). Sent-off players can't be picked again: the app hides
  them and the server refuses them (409).
- Sin bin (`sin_bin`, one of our players): a tenth of the match, at least 2
  minutes (`sinBinMinutes`), saved in the event's `text` so the length never
  changes. Match Centre shows each running sin bin with a countdown that
  pauses at half time (`activeSinBins`, `MatchPrompts.tsx`); the same player
  can't go in twice at once. Counted as `sinBins` in stats.
- The clock shows added time as "40+2'" (up to 15 minutes, then "40+'":
  `matchClock` on the server, `clockLabel` in the app). Past full length by 20
  minutes the match is `overdue` and Match Centre asks "Has it finished?"
  with a Full time button; 4 hours after kick-off it's `stale` ("Awaiting full
  time"), drops off members' screens and stays in staff's list to finish.
- Minutes played (`minutesPlayed`, `squadStats.seasonMinutes`) come from the
  line-up, subs, reds and the whistle times, only for matches with a line-up
  (match reports' red cards with a minute stop the clock too). Shown on the
  Stats screen (Minutes board) and player pages.
- Clubs can switch assists off (top goalscorers only): `tenants.track_assists`
  (migration 0028, default on), set in Club Settings → Match stats (app
  `MatchStatsCard`, website `MatchStatsSettings`; `PATCH /tenants/me
  {trackAssists}`, club admins). `/public/:club/info` returns `trackAssists`, so
  the app (`useTracksAssists`) and website hide assists: Match Centre skips
  "Who made the assist?", Stats drops the Assists and G+A boards, player pages,
  squad pages and the match report leave them out. The server also reads them
  as 0 (`services/clubOptions.ts`, `squadStats`, public squad, fun stats),
  ignores an assist sent with a goal, and the top scorers post drops the
  column. Assists already recorded are kept for if it's switched back on.
- Stats screen (`StatsScreen`, `utils/stats.ts`): season chips, squad totals
  and leaderboards (goals, assists, G+A, minutes, MOTM, cards: red = 2,
  sin bin = 1); joint places share a rank; tap a player for their page.

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
- Every screen takes its colours from `theme/brand.ts`: `useBrandColors()`
  (the club colour as `primary`, `onPrimary` for text on it, ink/card/border
  tokens) and `themedStyles((c) => ({...}))` for stylesheets that follow the
  club. react-native-paper's theme is built from the same colours
  (`theme/paperTheme.ts`, titles in Barlow Condensed), so Paper buttons, chips
  and switches match. Don't import `COLORS` from `config.ts` for accents: it
  is the fixed Boost Huddle cyan. Screens without a navigation bar start with
  `components/brand/ScreenIntro`; sections use `components/home/SectionTitle`.
- Web builds made with `EXPO_PUBLIC_E2E=1` expose `window.__openScreen(name)`
  so screenshot scripts can open any screen.
- Home (`screens/HomeScreen.tsx`, `components/home/`): header with crest,
  live cards, next match, league snapshot, quick links, latest feed. The menu
  (`CustomDrawerContent.tsx`) leaves out the bottom tabs (Home, Matches,
  Players, Highlights). Families get short groups (Match day, Training for
  players, Team, Club, Me; supporters without Team Talk, consent or signing
  on); staff get a boxed Coach zone first, in folding sections (one open at a
  time, the one you're in).

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
- The Pro plan includes every premium graphics pack (`packsIncludedWith` in
  `services/graphics/packs.ts`); on Starter they're unlocked one by one.
- The panel installs as its own phone app (`public/owner/manifest.webmanifest`,
  icons in `public/owner/`, a network-only `public/owner-sw.js` scoped to
  `/owner`): open /owner and "Add to Home Screen" / "Install app".
- The old consoles (`owner-admin/`, `admin/`, the website's root `/admin`,
  `/api/v1/admin/tenants|promo-codes|stats|users`, magic links, `/dev/*`,
  `/owner-api/*`) were removed in September 2026.

## Team Talk, reports and subs

- Team Talk (`routes/discussions.ts`; app `TeamTalkScreen` → `TeamTalkThreadScreen`,
  menu: My club; website Team talk): conversations in General and Match chat
  for players and parents, plus Training and Tactics for staff only.
  Supporters can't join in. Comments take replies, @mentions (they get a
  notification) and video moments like [12:34]. Staff pin, close and delete;
  authors delete their own. Deleting a conversation deletes its comments.
- Reporting (`routes/content-moderation.ts`): members tap Report on a
  comment or conversation (`components/reports/ReportSheet`, `POST
  /api/v1/content/report`, signed in, the club comes from the token; types
  `post` feed post, `comment`, `message` = conversation). Staff review in
  Manager zone → Reports (website Admin → Reports). "Remove it" really
  deletes it (a comment takes its replies) and closes every waiting report
  about it; Warn and Dismiss leave it.
- Subs and fees (`routes/dues.ts`; app Manager zone → Subs and fees,
  `DuesScreen`; website Admin → Subs and fees): payment requests and
  reminder emails (one per parent email, with the club's name). Paying
  online needs Stripe, so until then the email says to pay the club the
  usual way and has no pay link.
- Club extras (`services/clubModules.ts`, `tenants.modules` JSON, migration
  0030): Subs and fees (`subs`), Signing on (`signingOn`) and the Shop
  (`shop`) are off until a club admin switches them on (app Club Settings →
  Club extras `ClubExtrasCard`; website Admin → Settings `ClubExtrasSettings`;
  `PATCH /tenants/me {modules}`). `moduleGate` in `index.ts` refuses their
  routes (`dues`, `registration`, `signing-on`, `shop`, `printify`,
  `personalization`) with 403 `MODULE_OFF`; `/public/:club/info` returns
  `modules` so menus hide them (app drawer `module`, website
  `ClubExtraGate`/`useClubModules`). For clubs on TeamFeePay and the like.
- Signing on (`routes/signingOn.ts`, `services/signingOn/`, migration 0031):
  each season a linked parent (or staff, from a paper form) fills in the
  child's date of birth, address, school, medical notes, allergies, up to
  three emergency contacts, photo/video consent and the code of conduct
  (`signing_on_entries`); it also updates the squad row and consent. Staff
  set the fee, how to pay and the code of conduct (`signing_on_forms`), see
  who has signed on and mark fees paid. App `SigningOnScreen` (menu: My club →
  Signing on); website Admin → Signing on (`admin/registration`). Medical
  notes are only shown to staff and the child's family.

## Club history, friendlies, Last Man Standing and the calendar

- Club history (app menu: Training & stats → Club history, `ClubHistoryScreen`;
  website History): season chips, the record, top three scorers / assists /
  MOTM / appearances, the season's awards (club seasons only) and fun stats.
  Fun stats (`services/funStats.ts`; members `GET /api/v1/stats/fun?season=`,
  public `/public/:club/stats/fun?seasonId=`) and a club season's stats
  (`GET /seasons/:id/stats`, `seasonReview`) use the season's dates, never
  the old `season_id` columns. Award lists don't include player photos.
- Friendlies (app Manager zone → Friendlies, `FriendliesScreen`; website
  Friendlies; `routes/friendlies.ts`): a board shared by every club. Posts
  never send `contact_info`. An offer needs a date (one waiting offer per
  club per post); accepting is claimed once (`status = 'pending'`), adds a
  Friendly fixture for both clubs with home/away teams (the poster is at
  home unless it asked to play away) and declines the post's other offers.
  Staff are told in the app (`notifications`, one row per staff member) and
  by push (every staff role, not only admins).
- Last Man Standing: members play on Predictions (`LastManStandingScreen`);
  staff run it in Manager zone → Last Man Standing (`ManageLmsScreen`,
  `utils/lms.ts`) or on the website. Processing a round needs every score
  and claims the round once, so a double tap can't count twice.
- Fixtures calendar: match times and grounds are never public. Each member
  gets a private feed (`GET /api/v1/calendar/link` → `/api/v1/calendar/feed/<token>.ics`;
  the token is an HMAC of club + account with `JWT_SECRET`,
  `services/calendarToken.ts`, and the feed only works while the account is
  in the club). `GET /api/v1/calendar/export` (members) is a download. Both
  are built by `services/calendarIcs.ts` (UK times with TZID, home/away from
  the teams, untimed games all day, postponed and cancelled marked). The
  app's Fixtures screen → "Add fixtures to my calendar"
  (`components/fixtures/CalendarSubscribe`) subscribes Apple (webcal://) or
  Google Calendar with that private link.
- Staff delete club posts from Home (bin on a Club News card,
  `DELETE /api/v1/feed/:id`).
- Tactics (app Training & stats → Tactics, `TacticsScreen`, `utils/tactics.ts`;
  website Training → Tactics; `routes/tactics.ts`, `team_tactics`): formation
  drawn on a pitch plus style, pressing, build-up, line, and in/out of
  possession. Everyone at the club sees it; staff save it.
- Live match video in the app: Club Settings → Live match video
  (`LiveVideoCard`) connects YouTube with `from: "app"`, so Google lands on a
  "go back to the app" page (`routes/stream.ts` `appReturnPage`) instead of
  the website; the card refreshes when the app comes back into view.

## Access rules worth knowing

- Club-admin writes are wrapped in `staffOnly(...)` in `index.ts`; add new
  admin routes the same way.
- CORS: only our own sites (plus `CORS_ALLOWED`) may call the API from a
  browser; never add wildcards or domains we don't own.
- Player records: staff see everything; other members get the team-sheet view
  (`services/playerPrivacy.ts`) unless linked to that player.
