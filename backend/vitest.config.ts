
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { readFileSync } from 'fs';
import toml from 'toml';

// Read and parse wrangler.toml to get test environment variables
const wranglerConfig = toml.parse(readFileSync('wrangler.toml', 'utf-8'));
const testVars = (wranglerConfig.env as any).test.vars;

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "wrangler.toml",
          env: "test",
        },
        main: "src/index.ts",
        bindings: {
          ...testVars,
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
      'isomorphic-dompurify': new URL('./src/__mocks__/dompurify.ts', import.meta.url).pathname,
    },
  },
});
