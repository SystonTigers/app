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
});
