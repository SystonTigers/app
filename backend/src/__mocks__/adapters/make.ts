/**
 * Mock Make.com Adapter
 *
 * Use this mock in tests to avoid real Make.com webhook calls.
 * Import with: vi.mock("../adapters/make");
 */

import { vi } from "vitest";

export const mockPublishViaMake = vi.fn().mockResolvedValue({
  ok: true,
  execution_id: "mock-execution-id",
});

export const publishViaMake = mockPublishViaMake;

/**
 * Helper to set up Make.com mock with custom response
 */
export function mockMakeSuccess(customResponse?: Record<string, unknown>): void {
  mockPublishViaMake.mockResolvedValue({
    ok: true,
    execution_id: "mock-execution-id",
    ...customResponse,
  });
}

/**
 * Helper to set up Make.com mock to fail
 */
export function mockMakeFailure(error: string = "Make webhook failed"): void {
  mockPublishViaMake.mockRejectedValue(new Error(error));
}

/**
 * Helper to set up Make.com not configured error
 */
export function mockMakeNotConfigured(): void {
  mockPublishViaMake.mockRejectedValue(new Error("Make webhook not configured"));
}

/**
 * Reset mock to default behavior
 */
export function resetMakeMock(): void {
  mockPublishViaMake.mockReset();
  mockMakeSuccess();
}
