# End-to-end journeys

Each `*.e2e.test.ts` file follows one thing people do (sign up, run a match,
pick scorers, open a player's page...) against the real Worker and a D1
database built from `../../migrations/` plus a seeded test club (`setup.ts`).

- Run all: `npm run test:e2e` (part of `npm test`). One file:
  `npx vitest --run --config vitest.config.e2e.ts tests/e2e/<name>.e2e.test.ts`
- Helpers (`helpers.ts`): `call(path, { method, token, body })`,
  `registerAdmin(prefix, role?)` (staff of the test club), `registerMember(prefix)`.
- Each journey checks the happy path, who is refused, bad input and what
  other members see. Add one for every new user-facing flow.
- Test-only switches are set in `../../vitest.config.e2e.ts`
  (`SOCIAL_BACKGROUND_DRAWING=off`, `LINK_PREVIEWS=off`).
