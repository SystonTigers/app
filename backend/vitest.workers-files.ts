// Test files that import `cloudflare:test` and therefore must run inside the
// Workers runtime (vitest.config.ts). Everything else runs in Node
// (vitest.config.node.ts). Add new Workers-runtime tests here.
//
// E2E journeys (tests/e2e) need a fully migrated + seeded D1 database and run
// separately via `npm run test:e2e` (vitest.config.e2e.ts).
export const E2E_TEST_FILES = ["tests/e2e/**/*.test.ts"];

export const WORKERS_TEST_FILES = [
  "tests/**/*.test.ts",
  "src/routes/__tests__/chat.test.ts",
  "src/routes/__tests__/coaching.test.ts",
  "src/routes/__tests__/events.test.ts",
  "src/routes/__tests__/gallery.test.ts",
  "src/routes/__tests__/health.test.ts",
  "src/routes/__tests__/matches.test.ts",
  "src/routes/__tests__/motm.test.ts",
  "src/routes/__tests__/players.test.ts",
  "src/routes/__tests__/shop.test.ts",
  "src/routes/__tests__/signup.test.ts",
  "src/routes/__tests__/social.test.ts",
  "src/routes/__tests__/training.test.ts",
  "src/routes/__tests__/usage.test.ts",
  "src/routes/__tests__/videos.test.ts",
];
