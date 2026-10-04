# Roadmap: what's built and what's left

Updated 4 October 2026. Keep this short and current: when something here is
done, move it to "Built" (one line) and update `CLAUDE.md`.

## Built (the detail is in CLAUDE.md)

- **Match day:** Match Centre (live score, undo, line-ups, subs, opposition
  goals/cards, chances/saves, second yellows, sin bins with a countdown, added
  time on the clock, a nudge when full time is forgotten, minutes played), match alerts that skip people at the ground,
  live YouTube video, an "as it stands" league table during league games, Man
  of the Match pop-up and vote at full time.
- **Automatic posts:** server-drawn graphics in three packs (Elite is
  premium), the club badge and sponsor on every graphic, name styles and
  consent applied, brace/hat-trick posts, correction posts, scheduled club
  posts (countdown, match day, weekly fixtures/results/table, birthdays,
  player of the week/month, milestones, throwback, quotes, monthly results,
  fixtures and top scorers round-ups). Club Settings in
  the app and on the website decide what goes where.
- **Highlights:** clips of the match video from Match Centre taps (free), a
  phone-first video maker with scoreboard and captions, and Goal of the Month
  (staff pick the month's goals on the website, members watch and vote in the
  app, the winner is posted).
- **League and fixtures:** our own table sorted by goal difference (pasted
  results or table), FA Full-Time snippets, fixtures from FA emails (pasted or
  forwarded) and from photos.
- **Club:** players with first name and surname, player pages (own bio,
  season stats, photos, goal clips), results by season with scorers picked
  from the squad, stats, gallery, Training Centre (sessions, register), drill
  library with favourites, club drills and TikTok/Instagram/YouTube links,
  gallery photos with players tagged (shown on their pages),
  People & Roles, parent invite codes, photo/video consent with reminders.
- **Business:** club sign-up with a 14-day trial, Starter/Pro plans (Stripe,
  switched on by secrets), owner panel (clubs, trials, plans, suspensions).

## Next, in order

1. **Make sign-up work for real clubs:** Resend key and a sending domain
   (emails are only logged today), legal pages approved and published
   (drafts in `legal-docs/drafts/`), `npx eas init` for phone-app push.
2. **Decide the pricing model, then switch trial end on.** The read-only
   switch is built (`TRIAL_END_MODE = "read_only"` in `wrangler.toml`; off
   today). Prices in code: Starter £14.99, Pro £29.99 a month, per club
   (`routes/billing.ts` PLANS). Under discussion: per-team pricing, no free
   tier, multi-team discounts. Once decided: update PLANS and Stripe prices,
   flip the switch, update the landing page.
3. **XbotGo scoreboard:** push the live score to the camera's overlay.
4. **TikTok posting:** waiting on TikTok's app review; managers use Share.

## Switched off until they're ready

- **Club shop:** the app and website pages exist but aren't linked until
  Printify is set up (`PRINTIFY_API_TOKEN`, website Admin → Shop settings).
  Link them again (app menu `CustomDrawerContent`, website club home) once
  products show.
- **Sponsors page:** not linked; it has no sponsor list behind it. The
  sponsor on graphics (Club Settings) works.
- **Removed in October 2026 (unreachable or broken):** app Team Chat,
  Payments and Wearables screens; the website's chat page; the wearables
  API and Team Chat's backend; Team talk covers club conversation. Dues stay on the
  website (Admin → Dues); paying online needs Stripe.

## Tidy-up

- The Worker has no Durable Objects any more: the six unused ones
  (Provisioner, GeoFenceManager, ChatRoom, TenantRateLimiter, VotingRoom,
  MatchRoom) were deleted with the owner's agreement (`wrangler.toml`
  migration `v6`, October 2026). The old `chat_*` tables are still in D1.
- The old wearables tables are still in D1 (no code reads them); drop them in
  a migration if they stay unused.
- `docs/concepts/` holds design inspiration images only.
- Older docs are in `archive/` for history only.
