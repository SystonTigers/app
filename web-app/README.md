# Boost Huddle website (`web-app/`)

Next.js site deployed to Cloudflare with OpenNext as the `boost-huddle` Worker:
the landing page, club sign-up (`/create-team`, 14-day trial), public club
pages (`/<club>`), the club admin dashboard (`/<club>/admin`) and the owner
panel (`/owner`).

- Run locally: `npm install`, `npm run dev` (uses the live API unless
  `NEXT_PUBLIC_API_BASE` points at a local backend).
- Build and deploy: `npm run cf:build`, `npm run cf:deploy` (see
  `../START_HERE.md`).
- Check: `npx tsc --noEmit` (`npm run lint` is broken by Next 16).

Patterns to follow: `../docs/CONVENTIONS.md`.
