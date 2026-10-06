---
name: browser-check
description: Open the app in a real browser at phone size, signed in on a local test copy, and screenshot screens to spot errors and layout problems. Use after changing any app screen, when a bug is reported with a screenshot, or before saying UI work is finished.
---

# Browser check

`mobile/scripts/browser-check.mjs` runs the whole app on this computer with a
throwaway copy of the club and looks at it like a parent on their phone:

1. builds the local database (`backend/` migrations + `seed-syston.sql`),
2. creates a test admin (`browser-check@example.test`) with a random
   password nobody sees, and a random signing key for the local backend,
3. starts the backend (`wrangler dev --local`, port 8787) and the web app
   built from `mobile/` (port 4173, locked to `syston-tigers`),
4. signs in at 412×915 and opens each screen by its web address
   (`src/navigation/linking.ts`), saving a full-page screenshot.

The live app, live database and real accounts are never touched. Only ever
run it against this local copy; never point it at production or sign in
with a real person's account.

## Run it

```bash
cd mobile
npm run browser-check                          # the default list of 22 screens
npm run browser-check -- results stats         # only these (paths from linking.ts; "" is Home)
npm run browser-check -- --skip-build results  # reuse the last web build (after backend-only changes)
npm run browser-check -- --keep-data players/player?id=x  # keep test data you added locally
```

Seeding the test club replaces its row, which deletes its squad (the table
cascades). To look at a page with your own test players or results, add
them to the local copy (`npx wrangler d1 execute DB --local --file=...` in
`backend/`) and run with `--keep-data`.

Rebuild (no `--skip-build`) after changing anything in `mobile/`. The build
takes a minute or two; the backend and screens take about a minute more.

First time on a machine: `npm install` in the repo's top folder (backend and
web-app, which brings Playwright) and in `mobile/`, then
`cd web-app && npx playwright install chromium`.

## Read the result

- `mobile/.browser-check/report.md`: one row per screen with any problems:
  crashes, console errors, failed requests to our API, server errors (5xx)
  or a screen still loading after 15 s. Exit code 1 if any.
- `mobile/.browser-check/screens/<path>.png`: open every screen you changed
  (Read the PNG) and compare it with its neighbours using the
  `boost-huddle-design` skill and the `interface-checklist` skill.
- `sign-in-failed.png` means the run stopped at sign-in; the message shows
  the request that failed.

Both are git-ignored. The test club starts nearly empty, so empty states are
what you'll mostly see; to look at a full screen, add data first through the
local API (as the e2e journeys in `backend/tests/e2e` do) or the app itself.

## When to use it

- After changing an app screen: run it for that screen and look.
- When the owner sends a screenshot of a bug: reproduce it here first, fix,
  run again, and mention the before/after.
- Before calling UI work finished. If something can't be checked this way
  (push notifications, camera, location), say so.
