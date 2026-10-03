# Boost Huddle

A platform for grassroots football clubs: live Match Centre, automatic social
media graphics, free match highlights, league tables, player pages, training
and club admin. One Cloudflare Worker serves every club. Syston Tigers
(`syston-tigers`) is the first club on it.

| Part | Folder | Live as |
|---|---|---|
| API (Cloudflare Worker, D1, R2, KV) | `backend/` | `app-production` |
| App for players, parents and staff (Expo; also the installable web app) | `mobile/` | `boost-huddle-app` |
| Website: landing page, club sign-up, club pages, admin, owner panel (Next.js) | `web-app/` | `boost-huddle` |
| Shared API client for the web | `packages/sdk/` | |
| Python highlights tools (not used on match day any more) | `video-processing/` | |

## Where to read

1. **`START_HERE.md`**: run it, test it, deploy it, secrets.
2. **`CLAUDE.md`**: how every feature works, with file names. (Despite the
   name it's for any developer or AI assistant.)
3. **`docs/CONVENTIONS.md`**: how code is written here.
4. **`docs/ROADMAP.md`**: what's built and what's next.
5. `docs/MATCH_DAY_LIVE.md`: live video and match alerts in depth.

Everything in `archive/` is history: plans and status reports from 2025 that
no longer match the code. When any doc disagrees with the code, trust the code.

## Quick check

```bash
cd backend && npm test && npx tsc --noEmit     # API: unit, Workers and end-to-end tests
cd ../mobile && npx tsc --noEmit && npm test   # app
cd ../web-app && npx tsc --noEmit              # website
```
