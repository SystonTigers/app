# How code is written here

Read this before changing anything. It describes the patterns the code
actually follows (October 2026), so new work looks like it was always there.
`CLAUDE.md` explains what each part of the system does; this file explains
how to write it.

## Principles

- **Finish and harden, don't rebuild.** Extend the existing module. No new
  frameworks, UI kits or state libraries. A new dependency needs a reason
  that nothing in the repo already covers.
- **The code is the truth.** Docs can be stale; check the code before
  trusting a doc, and fix the doc when it's wrong.
- **Every query on club data filters by `tenant_id`.** The test
  `backend/src/__tests__/tenantGuard.test.ts` fails if a new query doesn't.
- **Never take roles or the club from the request body.** They come from the
  token (`requireStaff`, `requireTenantJWT`).
- **Children's data is private by default.** Anything public or shared with
  the wider club goes through the name style (`services/publicNames.ts`) and
  photo/video consent (`services/consent.ts`).
- **Free to run.** Prefer Cloudflare-native pieces (D1, R2, KV, cron, Workers
  AI) and free APIs. Nothing that charges per use without the owner agreeing.
- **No TODOs, placeholders or dead code.** If something can't be done yet,
  say so in `docs/ROADMAP.md`, not in a comment.

## Words people see

- UK English, plain and short: "Your badge is saved.", "Only club staff can
  change results.", "That didn't save. Please try again."
- Error messages say what to do next, never just "Error" or "Failed".
- No jargon in the app: "club" not "tenant", "posts" not "jobs", "season
  stats" not "aggregates".
- Football words as used in England: pitch, boots, bibs, kick-off, half time,
  full time, Man of the Match, own goal.

## Backend (Cloudflare Worker, `backend/`)

### Files
- Routes are registered in `src/index.ts`; each feature has a handler file in
  `src/routes/` and its logic in `src/services/` (a folder when it grows, e.g.
  `services/league/`, `services/playerProfile/`).
- A route file starts with a comment listing its endpoints and who may call
  them:

  ```ts
  /**
   * Drills: the club's own drills, everyone's favourites, and video links.
   *
   *   GET    /api/v1/training/drills          members: ...
   *   POST   /api/v1/training/drills          staff: a new club drill
   */
  ```
- Keep files under about 250 lines. Pure logic (parsing, sorting, building
  text) goes in its own module with no database access, so it can be unit
  tested in Node.
- TypeScript strict, no `any` in new code. Narrow request bodies at the edge
  (`readDrillInput`, `readPlayerName`, `parseResult` are the pattern: return
  the clean value or a message).

### Handlers
- Responses: `json({ success: true, data }, status, corsHdrs)` and, for
  errors, a local `fail(corsHdrs, status, CODE, "Message people can act on")`
  giving `{ success: false, error: { code, message } }`.
- Auth: a small local helper wraps `requireStaff` / `requireTenantJWT` and
  turns their thrown `Response` into 401/403 with a friendly message (see
  `routes/drills.ts` `who`, `routes/league.ts` `staff`). Admin-only actions
  check `hasAnyRole(claims, ADMIN_ROLES)`. Wrap club-admin writes in
  `staffOnly(...)` in `index.ts` as well.
- Logs are one JSON line: `console.log(JSON.stringify({ event: "club_badge",
  outcome: "uploaded", tenant, ... }))` or `logJSON({ level, msg, tenantId })`.
  Never log tokens, emails, phone numbers or passwords.
- Anything that can run twice (cron, webhooks, queue consumers, retries) is
  idempotent: unique keys (`source_id`, `INSERT OR IGNORE`, `ON CONFLICT`) or
  ids made from the thing they belong to (`live-<eventId>`, `res-<resultId>-<n>`).

### Database
- Schema changes are a new numbered file in `backend/migrations/`
  (`0028_short_name.sql`) with a comment saying why. Never edit an applied
  migration. `ALTER TABLE ... ADD COLUMN` for new fields; keep old columns
  working for screens that still send them.
- Keep reads cheap: one query with `IN (...)` rather than one per row; batch
  writes with `env.DB.batch`.
- Media goes in R2 through `services/media.ts` (`putMedia`, `mediaUrl`,
  `deleteMedia`) under a prefix listed in `PUBLIC_MEDIA_PREFIXES`; delete the
  old file when replacing one.

### Tests (`cd backend && npm test`)
- `src/**/__tests__/*.test.ts`: unit tests of pure functions (Node).
- `tests/e2e/*.e2e.test.ts`: one journey per user-facing flow, against a
  real database built from `migrations/`. Use `call`, `registerAdmin(prefix,
  role)` and `registerMember` from `tests/e2e/helpers.ts`. Check the happy
  path, who is refused (401/403), bad input (400) and what other members see.
- Environment switches for tests: `SOCIAL_BACKGROUND_DRAWING=off`,
  `LINK_PREVIEWS=off` (set in `vitest.config.e2e.ts`).

## App (`mobile/`, Expo; also the installable web app)

- Screens in `src/screens/`, feature components in `src/components/<feature>/`,
  API calls in `src/services/` (`apiClient` from `services/api.ts` adds the
  club and login), pure helpers in `src/utils/` with **no react-native
  imports**, tested by `node test/<name>.test.js` (add the file to the `test`
  script in `package.json`).
- A new screen is added in three places: `App.tsx` (`Drawer.Screen`),
  `src/navigation/linking.ts` (its web address) and, if it belongs in the
  menu, `components/CustomDrawerContent.tsx` (with the roles that see it).
- Colours only from the theme: `useBrandColors()` and `themedStyles((c) =>
  ({...}))` (the club's colour is `c.primary`, text on it `c.onPrimary`).
  Display type is `FONTS.display` (Barlow Condensed). Use react-native-paper
  components (`Button`, `Chip`, `TextInput`, `Snackbar`, `Modal`) as the
  existing screens do.
- Every screen handles loading, an error with "Try again", and an empty state
  that says what to do. Buttons have `accessibilityLabel`s; tap targets are
  big enough for the touchline.
- Shared state between screens is a small store with `useSyncExternalStore`
  (see `services/drillsStore.ts`), not a new library.
- Staff checks use `utils/roles.ts` (`isStaffRole`). The server still checks
  everything; the app only hides what people can't use.
- Check it: `npx tsc --noEmit && npm test`. For anything visual, build the
  web app against a local backend and look at it at phone width (390 px).

## Website (`web-app/`, Next.js on Cloudflare via OpenNext)

- Club admin pages are under `src/app/[tenant]/admin/`; shared pieces in
  `src/components/`; API calls through `src/lib/sdk.ts` / `lib/session.ts`.
- Tailwind classes in the style of the surrounding page; labels tied to
  inputs (`htmlFor`/`id`); errors shown inline with `role="alert"`.
- Keep behaviour in step with the app: the same rules (e.g. name splitting in
  `lib/playerNames.ts` matches `mobile/src/utils/playerNames.ts` and
  `backend/src/services/playerNames.ts`).
- Check it: `npx tsc --noEmit` (lint is broken by Next 16; see CLAUDE.md).

## Finishing a change

1. `npm test` and `npx tsc --noEmit` in `backend/`; `npx tsc --noEmit` and
   `npm test` in `mobile/`; `npx tsc --noEmit` in `web-app/`.
2. Update `CLAUDE.md` (behaviour), `START_HERE.md` (running/deploying) or
   `docs/ROADMAP.md` (what's left) in the same commit.
3. Commit with a conventional message (`feat:`, `fix:`, `docs:`, `chore:`)
   whose body says what changed for the people using it.
4. Deploying is done by hand (see `START_HERE.md`). Back up the database
   before any migration. Never deploy or push to `main` without the owner
   agreeing.
