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
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
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
