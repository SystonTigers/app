/**
 * Mock Social Media Adapters
 *
 * Provides mocks for X/Twitter, Instagram, Facebook, and TikTok.
 * Use these mocks in tests to avoid real social media API calls.
 */

import { vi } from "vitest";

// =============================================================================
// X/Twitter Mock
// =============================================================================

export const mockPublishToX = vi.fn().mockResolvedValue({
  ok: true,
  tweet_id: "mock-tweet-id",
  url: "https://twitter.com/mock/status/mock-tweet-id",
});

/**
 * Helper to set up X/Twitter mock with custom response
 */
export function mockXSuccess(customResponse?: Record<string, unknown>): void {
  mockPublishToX.mockResolvedValue({
    ok: true,
    tweet_id: "mock-tweet-id",
    url: "https://twitter.com/mock/status/mock-tweet-id",
    ...customResponse,
  });
}

/**
 * Helper to set up X/Twitter mock to fail
 */
export function mockXFailure(error: string = "X API error"): void {
  mockPublishToX.mockRejectedValue(new Error(error));
}

// =============================================================================
// Instagram Mock
// =============================================================================

export const mockPublishToInstagram = vi.fn().mockResolvedValue({
  ok: true,
  media_id: "mock-media-id",
  url: "https://instagram.com/p/mock-media-id",
});

/**
 * Helper to set up Instagram mock with custom response
 */
export function mockInstagramSuccess(customResponse?: Record<string, unknown>): void {
  mockPublishToInstagram.mockResolvedValue({
    ok: true,
    media_id: "mock-media-id",
    url: "https://instagram.com/p/mock-media-id",
    ...customResponse,
  });
}

/**
 * Helper to set up Instagram mock to fail
 */
export function mockInstagramFailure(error: string = "Instagram API error"): void {
  mockPublishToInstagram.mockRejectedValue(new Error(error));
}

// =============================================================================
// Facebook Mock
// =============================================================================

export const mockPublishToFacebook = vi.fn().mockResolvedValue({
  ok: true,
  post_id: "mock-post-id",
  url: "https://facebook.com/mock/posts/mock-post-id",
});

/**
 * Helper to set up Facebook mock with custom response
 */
export function mockFacebookSuccess(customResponse?: Record<string, unknown>): void {
  mockPublishToFacebook.mockResolvedValue({
    ok: true,
    post_id: "mock-post-id",
    url: "https://facebook.com/mock/posts/mock-post-id",
    ...customResponse,
  });
}

/**
 * Helper to set up Facebook mock to fail
 */
export function mockFacebookFailure(error: string = "Facebook API error"): void {
  mockPublishToFacebook.mockRejectedValue(new Error(error));
}

// =============================================================================
// TikTok Mock
// =============================================================================

export const mockPublishToTikTok = vi.fn().mockResolvedValue({
  ok: true,
  video_id: "mock-video-id",
  url: "https://tiktok.com/@mock/video/mock-video-id",
});

/**
 * Helper to set up TikTok mock with custom response
 */
export function mockTikTokSuccess(customResponse?: Record<string, unknown>): void {
  mockPublishToTikTok.mockResolvedValue({
    ok: true,
    video_id: "mock-video-id",
    url: "https://tiktok.com/@mock/video/mock-video-id",
    ...customResponse,
  });
}

/**
 * Helper to set up TikTok mock to fail
 */
export function mockTikTokFailure(error: string = "TikTok API error"): void {
  mockPublishToTikTok.mockRejectedValue(new Error(error));
}

// =============================================================================
// Reset All Social Mocks
// =============================================================================

export function resetAllSocialMocks(): void {
  mockPublishToX.mockReset();
  mockPublishToInstagram.mockReset();
  mockPublishToFacebook.mockReset();
  mockPublishToTikTok.mockReset();

  mockXSuccess();
  mockInstagramSuccess();
  mockFacebookSuccess();
  mockTikTokSuccess();
}
