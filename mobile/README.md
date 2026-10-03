# Boost Huddle app (`mobile/`)

The Expo (SDK 54) app for players, parents, supporters and staff. The same
code is built as the installable web app (`boost-huddle-app`), which is what
clubs use today (no app store yet).

- Multi-club: people find their club on first launch; the current club is in
  `src/services/club.ts` (`getTenantId()`). Never hardcode a club.
- Run: copy `.env.example` to `.env`, `npm install`, `npx expo start`.
- Web build: `npm run web:build` (`scripts/build-web.mjs`); deploy with
  `npm run web:deploy` or the deploy scripts described in `START_HERE.md`.
- Check: `npx tsc --noEmit && npm test` (Node tests of the pure helpers in
  `src/utils`, listed in `package.json`).

Where things are and how to add a screen: `../docs/CONVENTIONS.md`. What each
screen does: `../CLAUDE.md`.
