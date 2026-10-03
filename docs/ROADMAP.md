# Roadmap: what's built and what's left

Updated 3 October 2026. Keep this short and current: when something here is
done, move it to "Built" (one line) and update `CLAUDE.md`.

## Built (the detail is in CLAUDE.md)

- **Match day:** Match Centre (live score, undo, line-ups, subs, opposition
  goals/cards, chances/saves), match alerts that skip people at the ground,
  live YouTube video, an "as it stands" league table during league games, Man
  of the Match pop-up and vote at full time.
- **Automatic posts:** server-drawn graphics in three packs (Elite is
  premium), the club badge and sponsor on every graphic, name styles and
  consent applied, brace/hat-trick posts, correction posts, scheduled club
  posts (countdown, match day, weekly fixtures/results/table, birthdays,
  player of the week/month, milestones, throwback, quotes). Club Settings in
  the app and on the website decide what goes where.
- **Highlights:** clips of the match video from Match Centre taps (free), and
  a phone-first video maker with scoreboard and captions.
- **League and fixtures:** our own table sorted by goal difference (pasted
  results or table), FA Full-Time snippets, fixtures from FA emails (pasted or
  forwarded) and from photos.
- **Club:** players with first name and surname, player pages (own bio,
  season stats, photos, goal clips), results by season with scorers picked
  from the squad, stats, gallery, Training Centre (sessions, register), drill
  library with favourites, club drills and TikTok/Instagram/YouTube links,
  People & Roles, parent invite codes, photo/video consent with reminders.
- **Business:** club sign-up with a 14-day trial, Starter/Pro plans (Stripe,
  switched on by secrets), owner panel (clubs, trials, plans, suspensions).

## Next, in order

1. **Make sign-up work for real clubs:** Resend key and a sending domain
   (emails are only logged today), legal pages approved and published
   (drafts in `legal-docs/drafts/`), `npx eas init` for phone-app push.
2. **Decide the pricing model and enforce trial end.** Today the trial end
   date is stored but nothing changes when it passes: clubs keep everything.
   Prices in code: Starter £14.99, Pro £29.99 a month, per club
   (`routes/billing.ts` PLANS). Under discussion: per-team pricing, no free
   tier, read-only after the trial, multi-team discounts. Once decided:
   update PLANS and Stripe prices, add the read-only check, update the
   landing page.
3. **Review the tenant-guard baseline** (`backend/tests/tenant-guard-baseline.json`):
   about 60 older queries don't mention `tenant_id`. Most look up a row by an
   id already checked to belong to the club, but each should get an explicit
   `AND tenant_id = ?` (or be shown to be global) and leave the list.
4. **Match Centre gaps:** second yellow card (shown as a red), sin bin,
   minutes played worked out from line-ups and subs.
5. **More posts:** a player stats round-up post; monthly fixtures/results
   round-ups; check Goal of the Month end to end (`routes/gotm.ts`).
6. **Gallery tagging:** tag players in gallery photos so they appear on
   player pages (today player pages show Player Images only).
7. **XbotGo scoreboard:** push the live score to the camera's overlay.
8. **TikTok posting:** waiting on TikTok's app review; managers use Share.

## Tidy-up

- The old post queue and sign-up provisioner (`queue-consumer.ts`,
  `do/provisioner.ts`, `adapters/`, `services/tenantConfig.ts`) still carry
  the Make.com path (`use_make`, `ALLOWED_WEBHOOK_HOSTS`, `MAKE_VALIDATE_STRICT`).
  No live feature uses them (posting is `services/social/`, sign-up is
  `/create-team`); remove them together with their bindings and tests.
- Folders not used by any build: `workers/` (old highlights orchestrator and
  uploader), `shared/sdk` (the web uses `packages/sdk`), `docs/concepts`
  (design inspiration images only).
- `video-processing/` (Python highlights tools) hasn't been checked against
  the current app since the free YouTube-clip highlights replaced it for
  match day; check before relying on its README.
- Older docs are in `archive/` for history only.
