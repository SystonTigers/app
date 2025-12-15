/**
 * Cloudflare Workers Test Environment Types
 * Provides type declarations for cloudflare:test module
 */

declare module "cloudflare:test" {
    import type { Env } from "./env";

    /**
     * The test environment with all bindings configured in wrangler.toml
     */
    export const env: Env;

    /**
     * Create a new ExecutionContext for testing
     */
    export function createExecutionContext(): ExecutionContext;

    /**
     * Wait for all scheduled tasks in the execution context
     */
    export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;

    /**
     * Run scheduled event
     */
    export const SELF: {
        fetch(request: Request): Promise<Response>;
        scheduled(options?: { cron?: string }): Promise<void>;
    };
}
