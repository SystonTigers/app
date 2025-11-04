import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "wrangler.toml",
        },
      },
    },
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      // Mock isomorphic-dompurify for tests since it requires DOM
      'isomorphic-dompurify': new URL('./src/__mocks__/dompurify.ts', import.meta.url).pathname,
    },
  },
});
