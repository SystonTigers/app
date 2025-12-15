# Codex Playbook

Use this checklist when generating or reviewing changes for the Automation
Script project.

## Before You Start

1. Read the latest task description and confirm the target files.
2. Review `README-Developer.md` and `CODEX_INSTRUCTIONS.md` to understand
   constraints.
3. Inspect existing modules in `src/` to identify reusable helpers.

## During Implementation

1. **Plan** – Outline the minimal set of files and functions that need updates.
2. **Edit** – Apply changes using modern JavaScript conventions and keep
   modules focused.
3. **Validate** – Re-run relevant Apps Script functions locally or provide
   reasoning why runtime behavior remains correct.
4. **Document** – Update related markdown files or inline comments when
   behavior changes.

## Pre-Commit Review

- [ ] Confirm configuration values are sourced from Script Properties or the
  Sheet Config tab.
- [ ] Ensure new triggers use `ensureTimeTrigger` or another idempotent
  helper.
- [ ] Verify HTTP calls rely on `fetchJson` (or comparable enterprise client)
  with retries and safe parsing.
- [ ] Check that no PII is written to logs or documentation.
- [ ] Run linting, tests, or validation steps requested in the task.

## Pull Request Checklist

1. Summarize the problem and solution in the PR description.
2. List any new scopes or deployment actions required.
3. Attach screenshots or logs that demonstrate acceptance criteria.
4. Tag reviewers who own the impacted modules.

Following these steps keeps contributions predictable and aligned with the
automation platform's standards.
