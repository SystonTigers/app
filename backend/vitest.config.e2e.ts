import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import { E2E_TEST_FILES } from "./vitest.workers-files";

// End-to-end journeys against the real worker with a D1 database built from
// migrations/ (the same files production uses) plus a seeded test club.
export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));

  return {
    test: {
      include: E2E_TEST_FILES,
      setupFiles: ["./tests/e2e/setup.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: "wrangler.toml" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              JWT_SECRET: "e2e-test-secret-at-least-32-characters-long",
              JWT_ISSUER: "syston.app",
              JWT_AUDIENCE: "syston-mobile",
              ENVIRONMENT: "test",
            },
          },
        },
      },
    },
    resolve: {
      alias: {
        "isomorphic-dompurify": new URL("./src/__mocks__/dompurify.ts", import.meta.url).pathname,
      },
    },
  };
});
