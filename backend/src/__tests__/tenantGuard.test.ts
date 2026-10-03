/**
 * Every query on club data must filter by tenant_id (CLAUDE.md). This test
 * reads every SQL string in src/ and fails when a query touches a table with
 * a tenant_id column without mentioning tenant_id, unless it's one of:
 *  - GLOBAL_TABLES: tables that are keyed by club or user id themselves, or
 *    shared by every club on purpose;
 *  - CROSS_CLUB: single queries reviewed and kept because they reach across
 *    every club by design (a cron sweep, the owner panel, deleting a person's
 *    own account). Each says why. Prefer selecting tenant_id and handling each
 *    club separately; only add here when that isn't possible;
 *  - tenant-guard-baseline.json: older queries found when this test was
 *    added (October 2026), still to be reviewed one by one. Remove entries as
 *    they're fixed; never add new ones: add `AND tenant_id = ?` instead.
 *
 * If you rename a file or reword a baselined query, update its entry.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const GLOBAL_TABLES = new Set([
  "tenants", // its id is the club
  "auth_users", // accounts, looked up by user id or email
  "badge_library", // opponent badges shared by every club
  "organizations",
  "organization_members",
  "billing_events", // Stripe webhook idempotency, keyed by Stripe's event id
]);

/** "file :: normalised SQL" (as unfilteredQueries prints it) → why it may span every club. */
const CROSS_CLUB: Record<string, string> = {
  // Account deletion (GDPR): removes the person's own rows. User ids are
  // unique across clubs, and erasure must be complete wherever a row was written.
  "src/routes/auth.ts :: DELETE FROM auth_user_players WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM devices WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM discussions WHERE author_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM lms_entries WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM lms_predictions WHERE entry_id IN (SELECT id FROM lms_entries WHERE user_id = ?)": "account deletion",
  "src/routes/auth.ts :: DELETE FROM motm_votes WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM notifications WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM push_tokens WHERE user_id = ?": "account deletion",
  "src/routes/auth.ts :: DELETE FROM scheduled_notifications WHERE user_id = ?": "account deletion",
  // The push service said this device token is gone; devices.token is unique
  // across clubs, so the dead token is removed wherever it is.
  "src/services/push/delivery.ts :: DELETE FROM devices WHERE token = ?": "dead push token",
  // Once-a-minute cron sweeps over every club's queue (the rows they touch are
  // then handled per club, with tenant_id, by the code that follows).
  "src/services/matchAlerts/queue.ts :: UPDATE match_alerts SET status = 'cancelled', updated_at = ? WHERE status = 'pending' AND send_after < ?": "cron: drop stale alerts",
  "src/services/social/publish.ts :: UPDATE social_jobs SET status = 'pending' WHERE status = 'posting' AND updated_at < ? AND attempts < ?": "cron: retry stuck posts",
  // Platform owner panel (owners only): totals across every club.
  "src/services/owner/overview.ts :: SELECT COALESCE(SUM(amount_gbp), 0) AS total FROM platform_revenue WHERE created_at >= ?": "owner panel",
  "src/services/owner/overview.ts :: SELECT COUNT(*) AS c FROM live_match_events WHERE type = 'kick_off' AND deleted_at IS NULL AND ${ms(\"created_at\")} >= ?": "owner panel",
  "src/services/owner/overview.ts :: SELECT COUNT(*) AS c FROM squad": "owner panel",
};

/**
 * Tables with a tenant_id column. Each CREATE TABLE statement is read on its
 * own (up to the next one), so a one-line table can't hide the table after it.
 */
function tenantTables(): Set<string> {
  const sql = fs.readdirSync(path.join(ROOT, "migrations")).filter((f) => f.endsWith(".sql"))
    .map((f) => fs.readFileSync(path.join(ROOT, "migrations", f), "utf8")).join("\n");
  const tables = new Set<string>();
  for (const stmt of sql.split(/(?=\bCREATE TABLE\b)/i)) {
    const m = stmt.match(/^CREATE TABLE (?:IF NOT EXISTS )?["`]?(\w+)["`]?\s*\(([\s\S]*)/i);
    if (m && /\btenant_id\b/.test(m[2].split(/\n\s*\)\s*;|\)\s*;\s*(?:\n|$)/)[0])) tables.add(m[1]);
  }
  for (const m of sql.matchAll(/ALTER TABLE ["`]?(\w+)["`]? ADD COLUMN ["`]?tenant_id\b/gi)) tables.add(m[1]);
  return tables;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : sourceFiles(p);
    return e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [p] : [];
  });
}

/** "file :: normalised SQL" for each query that skips the tenant filter. */
export function unfilteredQueries(): string[] {
  const tables = tenantTables();
  const out: string[] = [];
  for (const file of sourceFiles(path.join(ROOT, "src"))) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/prepare\(\s*(`[\s\S]*?`|"[^"]*"|'[^']*')/g)) {
      const sql = m[1].slice(1, -1).replace(/\s+/g, " ").trim();
      const used = [...sql.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+(\w+)/gi)].map((x) => x[1]).filter((t) => tables.has(t) && !GLOBAL_TABLES.has(t));
      const entry = `${path.relative(ROOT, file)} :: ${sql}`;
      if (used.length && !/tenant_id/i.test(sql) && !(entry in CROSS_CLUB)) out.push(entry);
    }
  }
  return out.sort();
}

describe("tenant isolation", () => {
  it("has no new queries on club data without a tenant_id filter", () => {
    const baseline = new Set<string>(JSON.parse(fs.readFileSync(path.join(ROOT, "tests/tenant-guard-baseline.json"), "utf8")));
    const fresh = unfilteredQueries().filter((q) => !baseline.has(q));
    expect(fresh, "Add a tenant_id filter to these queries (see CLAUDE.md)").toEqual([]);
  });

  it("keeps the cross-club list honest (every entry is still a real query)", () => {
    const all = new Set<string>();
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const src = fs.readFileSync(file, "utf8");
      for (const m of src.matchAll(/prepare\(\s*(`[\s\S]*?`|"[^"]*"|'[^']*')/g)) all.add(`${path.relative(ROOT, file)} :: ${m[1].slice(1, -1).replace(/\s+/g, " ").trim()}`);
    }
    expect(Object.keys(CROSS_CLUB).filter((q) => !all.has(q)), "Remove or update these in CROSS_CLUB").toEqual([]);
  });

  it("keeps the baseline honest (fixed queries are removed from it)", () => {
    const now = new Set(unfilteredQueries());
    const baseline: string[] = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/tenant-guard-baseline.json"), "utf8"));
    expect(baseline.filter((q) => !now.has(q)), "These are fixed or moved: remove or update them in tests/tenant-guard-baseline.json").toEqual([]);
  });
});
