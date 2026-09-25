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
      // Journeys that post to social media wait for the server to draw graphics
      testTimeout: 30_000,
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
              // Test-only key for encrypting social media tokens (32 zero bytes)
              SOCIAL_TOKEN_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
              BACKEND_URL: "https://api.test",
              APP_BASE_URL: "https://site.test",
              META_APP_ID: "meta-app-1",
              META_APP_SECRET: "meta-secret",
              META_LOGIN_CONFIG_ID: "cfg-1",
              // Journeys draw and post explicitly (see services/social/publish.ts)
              SOCIAL_BACKGROUND_DRAWING: "off",
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
