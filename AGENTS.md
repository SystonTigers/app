# Instructions for AI coding assistants

This file is read by Codex, Copilot, Gemini, Cursor and similar tools. Claude
reads `CLAUDE.md`. Both say the same thing:

1. Read `START_HERE.md`, then `CLAUDE.md` (how each feature works), then
   `docs/CONVENTIONS.md` (how code is written here) before changing anything.
2. `docs/ROADMAP.md` lists what's built and what's next.
3. The code is the source of truth. Files in `archive/` are history; ignore
   them unless asked.
4. Non-negotiables: every query on club data filters by `tenant_id` (a test
   enforces it); roles come from the token, never the request; children's
   names and photos go through the club's name style and consent checks;
   no TODOs or placeholders; UK English in anything people see.
5. Before finishing: `npm test` and `npx tsc --noEmit` in `backend/`,
   `npx tsc --noEmit` and `npm test` in `mobile/`, `npx tsc --noEmit` in
   `web-app/`. Update `CLAUDE.md` / `docs/ROADMAP.md` in the same commit.
6. Never deploy, run a production migration or push to `main` without the
   owner agreeing.
