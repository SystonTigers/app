/// <reference types="@cloudflare/vitest-pool-workers" />
import { applyD1Migrations, env } from "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}

// Build the schema from migrations/ (idempotent: already-applied files are skipped)
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// The journeys use a club with id "syston"
await env.DB.prepare(
  `INSERT OR IGNORE INTO tenants (id, slug, name, email, plan, status, created_at, updated_at)
   VALUES ('syston', 'syston', 'Syston Tigers (test)', 'test@example.com', 'pro', 'active', unixepoch(), unixepoch())`
).run();
