/**
 * Every query on club data must filter by tenant_id (CLAUDE.md). This test
 * reads every SQL string in src/ and fails when a query touches a table with
 * a tenant_id column without mentioning tenant_id, unless it's one of:
 *  - GLOBAL_TABLES: tables that are keyed by club or user id themselves, or
 *    shared by every club on purpose;
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

function tenantTables(): Set<string> {
  const sql = fs.readdirSync(path.join(ROOT, "migrations")).filter((f) => f.endsWith(".sql"))
    .map((f) => fs.readFileSync(path.join(ROOT, "migrations", f), "utf8")).join("\n");
  const tables = new Set<string>();
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\n\);/gi)) if (/\btenant_id\b/.test(m[2])) tables.add(m[1]);
  for (const m of sql.matchAll(/ALTER TABLE (\w+) ADD COLUMN tenant_id/gi)) tables.add(m[1]);
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
      if (used.length && !/tenant_id/i.test(sql)) out.push(`${path.relative(ROOT, file)} :: ${sql}`);
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

  it("keeps the baseline honest (fixed queries are removed from it)", () => {
    const now = new Set(unfilteredQueries());
    const baseline: string[] = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/tenant-guard-baseline.json"), "utf8"));
    expect(baseline.filter((q) => !now.has(q)), "These are fixed or moved: remove or update them in tests/tenant-guard-baseline.json").toEqual([]);
  });
});
