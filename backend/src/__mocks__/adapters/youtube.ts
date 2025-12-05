/**
 * Mock YouTube Adapter
 *
 * Use this mock in tests to avoid real YouTube API calls.
 * Import with: vi.mock("../adapters/youtube");
 */

import { vi } from "vitest";

export const mockPublishYouTube = vi.fn().mockResolvedValue({
  ok: true,
  watch_url: "https://www.youtube.com/watch?v=mock-broadcast-id",
  broadcast_id: "mock-broadcast-id",
  stream_id: "mock-stream-id",
  start_iso: new Date().toISOString(),
});

export const publishYouTube = mockPublishYouTube;

/**
 * Helper to set up YouTube mock with custom response
 */
export function mockYouTubeSuccess(customResponse?: Partial<{
  ok: boolean;
  watch_url: string;
  broadcast_id: string;
  stream_id: string;
  start_iso: string;
}>): void {
  mockPublishYouTube.mockResolvedValue({
    ok: true,
    watch_url: "https://www.youtube.com/watch?v=mock-broadcast-id",
    broadcast_id: "mock-broadcast-id",
    stream_id: "mock-stream-id",
    start_iso: new Date().toISOString(),
    ...customResponse,
  });
}

/**
 * Helper to set up YouTube mock to fail
 */
export function mockYouTubeFailure(error: string = "YouTube API error"): void {
  mockPublishYouTube.mockRejectedValue(new Error(error));
}

/**
 * Helper to set up YouTube not configured error
 */
export function mockYouTubeNotConfigured(): void {
  mockPublishYouTube.mockRejectedValue(new Error("YouTube not configured for tenant"));
}

/**
 * Reset mock to default behavior
 */
export function resetYouTubeMock(): void {
  mockPublishYouTube.mockReset();
  mockYouTubeSuccess();
}
