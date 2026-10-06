---
name: boost-huddle-design
description: The Boost Huddle look, for the app (mobile/) and the website (web-app/). Use before adding or restyling any screen, page, card, button, empty state or copy, so new work looks like it was always there and follows each club's colour.
---

# Boost Huddle design rules

New work should look like the screens next to it. When this file and the code
disagree, the code wins: fix this file. Code rules (where files go, tests)
are in `docs/CONVENTIONS.md`; this file is how things look and read.

## The feel

Dark, bold, sporty. A floodlit pitch at night: ink background, raised cards,
one bright accent (the club's colour), big condensed capitals for headings.
Calm and readable on a phone held in one hand on a cold touchline.

## Colour

Every club picks its colour; nothing is hard-coded to yellow or cyan.

| Role | App (`theme/brand.ts`) | Website (Tailwind) |
|---|---|---|
| Page background | `c.background` (#07090C) | `bg-background` |
| Card | `c.surface` (#12161B) | `card` / `bg-surface` |
| Raised card, pressed state | `c.surfaceRaised` (#1A1F26) | `bg-surface-raised` |
| Border | `c.border` (white 8%) | `border-border` |
| Text | `c.text` (#F2F5F7) | `text-foreground` |
| Secondary text | `c.textLight` (62%) | `text-muted` |
| Club colour (buttons, active chips, highlights) | `c.primary` | `bg-brand`, `text-brand` |
| Text on the club colour | `c.onPrimary` | `text-brand-foreground` |
| Faint club colour (selected rows, icon tiles) | `c.primarySoft` | `bg-brand/15` |
| Win / draw / loss, good / warning / error | `c.success` / `c.warning` / `c.error` | `text-green-400` / `text-amber-300` / `text-red-400` |

- App: get colours from `useBrandColors()` and `themedStyles((c) => ({...}))`.
  Never import `COLORS` from `config.ts` for accents (it's the fixed Boost
  Huddle cyan) and never write hex colours in a screen.
- One accent per screen. The club colour marks what to tap or what's
  selected; it isn't decoration. Everything else is ink, card and text.
- Text on the club colour always uses `onPrimary` / `brand-foreground`
  (clubs with light colours like yellow get dark text automatically).

## Type

- Headings, scores, numbers and labels: Barlow Condensed
  (`FONTS.display` in the app, `font-display` / `page-title` / `eyebrow` on the
  website), usually UPPERCASE with a little letter spacing.
- Everything else: the system font. Never a third font.
- App sizes in use: screen titles 28–34, card titles 20, scores 24–26,
  body 15, meta and hints 12, tiny labels 11 bold with spacing 1.

## Shape and spacing

- Cards: radius 16–18, 1px `border`, `surface` background, padding 12–20.
- Chips and pills: fully rounded (999), outlined; selected = filled club colour.
- Screen padding 16; gaps between cards 10–12; leave 96 at the bottom when a
  floating button (FAB) sits over the list.
- Website: `container`, `card`, `btn btn-primary|btn-secondary|btn-ghost`,
  `chamfer-sm` / `chamfer-lg` for the cut-corner look, `hexagon` for icon tiles.

## Building blocks (reuse, don't remake)

- App: `components/brand/ScreenIntro` (screens without a header bar),
  `components/home/SectionTitle` (section heading with the accent bar),
  `components/ui/Card`, `components/seasons/SeasonPicker` (season chips),
  react-native-paper `Button`, `Chip`, `TextInput`, `FAB`, `Snackbar`, `Modal`.
- Website: `components/ui/Page.tsx` (`PageHeader`, `EmptyNote`,
  `MembersOnly`), `components/ui/Icon`, `PublicSeasonTabs`.
- The hex-grid backdrop (`components/brand/Backdrop`) is for the launch
  screen, home header and menu only, not ordinary pages.

## Every screen has four states

1. **Loading**: a spinner or pulsing card shapes, never a blank page.
2. **Error**: what went wrong in plain words and a "Try again".
3. **Empty**: what will appear here and what to do next (staff get the
   action; members get reassurance). Example: "No results for this season
   yet. Results from Match Centre appear here automatically."
4. **Full**: the content.

## Words

- UK English, short, friendly, football words as used in England
  (kick-off, full time, Man of the Match, pitch, boots).
- Say what happened and what to do next: "That didn't save. Check your
  signal and try again." Never "Error", "Failed" or a code.
- No tech words people don't use: club (not tenant), post (not job), season
  stats (not aggregates).
- Buttons say what they do: "Add result", "Open voting", "Post team news".
- Children's privacy first: names in the club's name style, photos and video
  only with consent (see CLAUDE.md "Photo and video consent").

## Phones first

- Design at 390–412 px wide, then check it scales up. No sideways scrolling
  except deliberate chip rows.
- Tap targets at least 44×44 (touchline, gloves, one thumb).
- Everything tappable has an `accessibilityLabel` (app) or a label/`aria-label`
  (website).

## Check your work

Run the `browser-check` skill on the screens you touched and look at the
screenshots next to their neighbours: same colours, type, spacing and states.
