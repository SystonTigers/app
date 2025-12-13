/**
 * Type declarations for Cloudflare Workers test environment
 * The cloudflare:test module is provided by @cloudflare/vitest-pool-workers
 * at test runtime but needs type declarations for TypeScript
 */

declare module "cloudflare:test" {
  import type { Env } from "./env";

  /**
   * Test environment provided by Cloudflare Workers test pool
   * This is automatically populated with bindings from wrangler.toml during tests
   */
  export const env: Env;

  /**
   * Create a test-only Durable Object namespace
   */
  export function createExecutionContext(): ExecutionContext;

  /**
   * Wait for all promises in the test context
   */
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;

  /**
   * Create a test-only scheduled event
   */
  export function createScheduledController(
    scheduledTime?: Date | number
  ): ScheduledController;

  /**
   * Create a test-only queue event
   */
  export function createMessageBatch(
    queueName: string,
    messages: Array<{ body: unknown; timestamp?: Date | number }>
  ): MessageBatch;
}
