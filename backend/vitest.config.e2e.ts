import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { E2E_TEST_FILES } from "./vitest.workers-files";

// End-to-end journeys against the real worker. These need the D1 schema and a
// seeded tenant, so they're kept out of the default `npm test` run.
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "wrangler.toml" },
      },
    },
    include: E2E_TEST_FILES,
  },
  resolve: {
    alias: {
      "isomorphic-dompurify": new URL("./src/__mocks__/dompurify.ts", import.meta.url).pathname,
    },
  },
});
