/**
 * External API Mocking Infrastructure
 *
 * This module provides a centralized mocking system for all external API calls.
 *
 * Usage in tests:
 *
 * 1. Global fetch interceptor (recommended for integration tests):
 * ```typescript
 * import { setupExternalApiMocks, teardownExternalApiMocks } from "../__mocks__";
 *
 * beforeEach(() => {
 *   setupExternalApiMocks();
 * });
 *
 * afterEach(() => {
 *   teardownExternalApiMocks();
 * });
 * ```
 *
 * 2. Module-level mocking (recommended for unit tests):
 * ```typescript
 * vi.mock("../adapters/youtube");
 * import { mockYouTubeSuccess } from "../__mocks__/adapters/youtube";
 *
 * it("publishes to YouTube", async () => {
 *   mockYouTubeSuccess();
 *   // ... test code
 * });
 * ```
 *
 * 3. Custom mock responses:
 * ```typescript
 * import { addMockConfig } from "../__mocks__";
 *
 * addMockConfig({
 *   pattern: /api\.example\.com/,
 *   handler: () => ({ body: { custom: "response" } }),
 * });
 * ```
 */

// =============================================================================
// Fetch Interceptor
// =============================================================================

export {
  // Core functions
  installFetchMock,
  uninstallFetchMock,
  setupExternalApiMocks,
  teardownExternalApiMocks,
  // Configuration
  addMockConfig,
  removeMockConfig,
  clearMockConfigs,
  defaultMockConfigs,
  // Statistics
  getFetchMockStats,
  resetFetchMockStats,
  // Assertions
  assertApiCalled,
  assertApiNotCalled,
  getApiCalls,
  // Mock responses
  youtubeResponses,
  googleOAuthResponses,
  printifyResponses,
  weatherResponses,
  makeResponses,
  resendResponses,
  expoPushResponses,
  // Types
  type MockResponse,
  type MockConfig,
  type MockFetchStats,
} from "./externalApis";

// =============================================================================
// Adapter Mocks
// =============================================================================

// YouTube
export {
  publishYouTube,
  mockPublishYouTube,
  mockYouTubeSuccess,
  mockYouTubeFailure,
  mockYouTubeNotConfigured,
  resetYouTubeMock,
} from "./adapters/youtube";

// Make.com
export {
  publishViaMake,
  mockPublishViaMake,
  mockMakeSuccess,
  mockMakeFailure,
  mockMakeNotConfigured,
  resetMakeMock,
} from "./adapters/make";

// Social Media
export {
  mockPublishToX,
  mockXSuccess,
  mockXFailure,
  mockPublishToInstagram,
  mockInstagramSuccess,
  mockInstagramFailure,
  mockPublishToFacebook,
  mockFacebookSuccess,
  mockFacebookFailure,
  mockPublishToTikTok,
  mockTikTokSuccess,
  mockTikTokFailure,
  resetAllSocialMocks,
} from "./adapters/social";

// =============================================================================
// Service Mocks
// =============================================================================

// Printify
export {
  PrintifyService,
  mockGetProducts,
  mockGetProduct,
  mockCreateOrder,
  mockCalculateShipping,
  mockPrintifyProducts,
  mockPrintifyFailure,
  resetPrintifyMocks,
} from "./services/printify";

// Email
export {
  sendEmail,
  mockSendEmail,
  getSentEmails,
  getEmailsTo,
  getEmailsWithSubject,
  clearSentEmails,
  assertEmailSent,
  assertNoEmailsSent,
  mockEmailFailure,
  resetEmailMock,
  type EmailOptions,
  type EmailResult,
} from "./services/email";

// Weather
export {
  getWeather,
  mockGetWeather,
  mockWeatherData,
  mockRainyWeather,
  mockSunnyWeather,
  mockWeatherFailure,
  resetWeatherMock,
  type WeatherData,
} from "./services/weather";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Reset all mocks to their default state
 * Use this in beforeEach or afterEach to ensure clean test state
 */
export function resetAllMocks(): void {
  // Import dynamically to avoid circular dependencies
  const { resetYouTubeMock } = require("./adapters/youtube");
  const { resetMakeMock } = require("./adapters/make");
  const { resetAllSocialMocks } = require("./adapters/social");
  const { resetPrintifyMocks } = require("./services/printify");
  const { resetEmailMock } = require("./services/email");
  const { resetWeatherMock } = require("./services/weather");
  const { resetFetchMockStats } = require("./externalApis");

  resetYouTubeMock();
  resetMakeMock();
  resetAllSocialMocks();
  resetPrintifyMocks();
  resetEmailMock();
  resetWeatherMock();
  resetFetchMockStats();
}
