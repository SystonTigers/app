import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { E2E_TEST_FILES, WORKERS_TEST_FILES } from "./vitest.workers-files";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "wrangler.toml",
        },
      },
    },
    // Only tests that need the Workers runtime; the rest run in Node (vitest.config.node.ts)
    include: WORKERS_TEST_FILES,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ...E2E_TEST_FILES,
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/__tests__/**",
        "**/*.test.ts",
        "**/do/**", // Durable Objects
        "src/queue-consumer.ts", // Queue consumer
        "src/__mocks__/**",
      ],
    },
  },
  resolve: {
    alias: {
      // Mock isomorphic-dompurify for tests since it requires DOM
      'isomorphic-dompurify': new URL('./src/__mocks__/dompurify.ts', import.meta.url).pathname,
    },
  },
});
