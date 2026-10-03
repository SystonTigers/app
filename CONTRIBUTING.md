# Contributing

- Read `docs/CONVENTIONS.md` first; it describes the patterns to follow.
- Work on a branch; `main` is what's live. Commit messages use conventional
  prefixes (`feat:`, `fix:`, `docs:`, `chore:`) and say what changed for the
  people using it.
- Every change passes the checks in `README.md` ("Quick check"), adds or
  updates tests (a unit test for logic, an end-to-end journey for a new
  flow), and updates `CLAUDE.md` / `docs/ROADMAP.md` when behaviour changes.
- GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on pushes
  and pull requests.
- Never commit secrets, tokens, backups or command output; `.gitignore`
  covers the usual ones.
