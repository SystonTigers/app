# Security

Checked against the code in October 2026.

## Reporting a problem

Email systontowntigersfc@gmail.com. Please don't open a public issue for a
security problem.

## How the platform is protected

- **Logins:** HS256 JWTs signed with `JWT_SECRET` (`iss` `syston.app`, `aud`
  `syston-mobile`), each with a revocable id. Passwords are bcrypt hashes.
  Owner-panel sessions are 12-hour tokens in an HttpOnly, SameSite=Strict
  cookie.
- **Roles** come only from the token. People choose Parent, Player or
  Supporter at sign-up; staff roles are given by club admins; platform
  owners are created from the command line (`npm run owner:create:prod`).
- **Clubs are kept apart:** every query on club data filters by `tenant_id`.
  `backend/src/__tests__/tenantGuard.test.ts` fails if a new query doesn't
  (older exceptions under review are listed in `tests/tenant-guard-baseline.json`).
- **Club-admin writes** go through `staffOnly(...)` and role checks in the
  handler. End-to-end tests check that members get 403.
- **Children:** public pages and social posts use the club's name style and
  show photos and video only with a parent's consent. Player bios can't
  contain contact details. Locations for "at the match" never leave the phone.
- **CORS:** only our own sites (and `CORS_ALLOWED`); no wildcards.
- **Stripe webhooks** are verified with `STRIPE_WEBHOOK_SECRET`.
- **Third-party scripts:** the FA Full-Time widget runs in a sandboxed frame
  without same-origin, so it can't read tokens.
- **Secrets** are set with `npx wrangler secret put NAME --env production` and
  never committed. Social media tokens are encrypted with `SOCIAL_TOKEN_KEY`.
  Changing `JWT_SECRET` logs everyone out.
