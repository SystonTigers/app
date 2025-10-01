# Contributing

## Branches
- `main`: deploys via GitHub Actions.
- Feature branches → PR → squash merge.

## Code Style
- TypeScript strict. Prefer small functions.
- Validate all inputs with zod.
- No console.log secrets. Use structured logs.

## Commits
- Conventional-ish: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

## Tests (manual for now)
- Use `CODEX_STEPS.md` curls.
- Confirm BYO-Make and Managed paths.
- Confirm `/healthz` for each worker.

## Security PRs
- Never commit secrets or tokens.
- Scrub logs in examples.
