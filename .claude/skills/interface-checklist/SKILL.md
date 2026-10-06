---
name: interface-checklist
description: Review checklist for screens and pages people use (app and website) - accessibility, forms, phones, loading, motion, words. Use when reviewing or finishing any UI change, or when asked to audit a screen.
---

# Interface checklist

Go through this list for every screen or page you add or change, fix what
fails, and say in your summary which points you checked. Adapted for this
app from Vercel's Web Interface Guidelines (MIT,
https://github.com/vercel-labs/web-interface-guidelines); the look itself is
in the `boost-huddle-design` skill.

## Tapping and keyboards

- [ ] Every tap target is at least 44×44, with space between neighbours
      (one thumb, maybe gloves, on a touchline).
- [ ] Everything tappable has a name a screen reader can say:
      `accessibilityLabel` + `accessibilityRole` in the app, a visible label
      or `aria-label` on the website. Icon-only buttons always need one.
- [ ] On the website, everything works with a keyboard: Tab reaches it in a
      sensible order, Enter/Space activates it, focus is visible (the brand
      outline), and Escape closes pop-ups and modals.
- [ ] Links go somewhere (`<a>`/`<Link>`), buttons do something (`<button>`);
      never a clickable `<div>`.
- [ ] Selected and on/off states are announced (`accessibilityState`,
      `aria-selected`, `aria-pressed`), not shown by colour alone.

## Forms

- [ ] Each input has a label tied to it (`htmlFor`/`id` on the website).
- [ ] Inputs use the right keyboard and autofill: `email`, `tel`, `number`,
      `autoComplete` (email, password, name), no autocorrect on emails/codes.
- [ ] Pasting works everywhere; nothing blocks it.
- [ ] Mistakes are shown next to the field, in plain words, with how to fix
      them; the form keeps what was typed.
- [ ] The submit button shows it's working and can't be pressed twice
      (`loading`/`disabled`), and the server copes if it is.
- [ ] Destructive actions (remove, undo full time) ask first and say what
      will happen ("The league table is updated straight away").

## Loading, errors, empty

- [ ] Loading, error (with "Try again"), empty (says what to do next) and
      full states all exist and were looked at.
- [ ] Content doesn't jump about when data arrives: reserve space for
      images, scores and lists (fixed sizes, skeleton cards).
- [ ] Slow signal is normal at grounds: nothing hangs forever; pull to
      refresh works; a failed request leaves the screen usable.

## Layout on phones

- [ ] Looks right at 390 px wide and at tablet/desktop width; no sideways
      scrolling except deliberate chip rows.
- [ ] Long names (clubs, players, venues like "MILLFIELD RECREATION GROUND")
      wrap or shorten cleanly instead of breaking the layout.
- [ ] Nothing important hides under the floating button, the home bar or a
      notch (bottom padding, safe areas).
- [ ] Numbers that change (scores, clocks, counts) use even-width digits so
      they don't wobble (`fontVariant: ['tabular-nums']` / `tabular-nums`).

## Motion

- [ ] Animation explains a change (something appearing, moving, finishing);
      none just for show. Short (150–300 ms) and can be interrupted.
- [ ] Respects "reduce motion" on the website (`motion-safe:` /
      `prefers-reduced-motion`).
- [ ] Animate transform and opacity only, never layout.

## Contrast and colour

- [ ] Text is readable on its background (4.5:1 for body text). Text on the
      club colour uses `onPrimary` / `brand-foreground`, so light club
      colours still work.
- [ ] Meaning never relies on colour alone: win/draw/loss also show W/D/L,
      errors also show words or an icon.

## Words

- [ ] UK English, short, friendly, football words (see `boost-huddle-design`).
- [ ] Errors say what to do next; buttons say what they do.
- [ ] Dates and times read naturally for the UK ("Sun 14 Sep 2025, 14:00").

## Privacy (children's club)

- [ ] Public or club-wide screens show names in the club's name style and
      photos/video only with consent.
- [ ] No emails, phone numbers or addresses shown to people who shouldn't
      see them (see `services/playerPrivacy.ts`).

## Proof

- [ ] `npx tsc --noEmit` passes in `mobile/` and/or `web-app/`.
- [ ] App screens: `cd mobile && npm run browser-check -- <paths>` is clean
      and the screenshots were looked at (the `browser-check` skill).
