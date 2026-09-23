import { defineConfig } from "vitest/config";
import { WORKERS_TEST_FILES } from "./vitest.workers-files";

export default defineConfig({
    test: {
        // Use threads pool (Node.js) instead of Workers pool
        pool: "threads",
        include: ["src/**/*.test.ts"],
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            // These need the Workers runtime; run them with `npm run test:workers`
            ...WORKERS_TEST_FILES,
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
