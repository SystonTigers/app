/**
 * External API Mock Infrastructure
 *
 * This module provides mocking capabilities for all external API calls.
 * It intercepts fetch requests and returns mock responses for testing.
 */

// =============================================================================
// Types
// =============================================================================

export interface MockResponse {
  body: unknown;
  status?: number;
  headers?: Record<string, string>;
}

export interface MockConfig {
  pattern: RegExp | string;
  handler: (url: string, options?: RequestInit) => MockResponse | Promise<MockResponse>;
}

export interface MockFetchStats {
  totalCalls: number;
  mockHits: number;
  passThrough: number;
  calls: Array<{
    url: string;
    method: string;
    mocked: boolean;
    timestamp: number;
  }>;
}

// =============================================================================
// Mock Responses - External Services
// =============================================================================

/**
 * YouTube API Mock Responses
 */
export const youtubeResponses = {
  tokenRefresh: {
    access_token: "mock-youtube-access-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "https://www.googleapis.com/auth/youtube",
  },
  liveBroadcast: {
    kind: "youtube#liveBroadcast",
    etag: "mock-etag",
    id: "mock-broadcast-id",
    snippet: {
      title: "Mock Live Broadcast",
      description: "Test broadcast",
      channelId: "mock-channel-id",
      scheduledStartTime: new Date().toISOString(),
    },
    status: {
      lifeCycleStatus: "created",
      privacyStatus: "unlisted",
      recordingStatus: "notRecording",
    },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
    },
  },
  liveStream: {
    kind: "youtube#liveStream",
    etag: "mock-etag",
    id: "mock-stream-id",
    snippet: {
      title: "Mock Stream",
      channelId: "mock-channel-id",
    },
    cdn: {
      format: "1080p",
      ingestionType: "rtmp",
      ingestionInfo: {
        streamName: "mock-stream-name",
        ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
      },
    },
    status: {
      streamStatus: "ready",
    },
  },
  bindBroadcast: {
    kind: "youtube#liveBroadcast",
    etag: "mock-etag",
    id: "mock-broadcast-id",
    contentDetails: {
      boundStreamId: "mock-stream-id",
    },
  },
};

/**
 * Google OAuth Mock Responses
 */
export const googleOAuthResponses = {
  tokenRefresh: {
    access_token: "mock-google-access-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "email profile",
  },
  userInfo: {
    id: "mock-google-user-id",
    email: "test@gmail.com",
    name: "Test User",
    picture: "https://lh3.googleusercontent.com/mock-avatar",
    verified_email: true,
  },
};

/**
 * Printify API Mock Responses
 */
export const printifyResponses = {
  products: {
    current_page: 1,
    last_page: 1,
    data: [
      {
        id: "mock-product-1",
        title: "Team Jersey",
        description: "Official team jersey",
        images: [{ src: "https://example.com/jersey.jpg", is_default: true }],
        variants: [
          { id: 101, title: "S / Black", price: 2999, is_enabled: true },
          { id: 102, title: "M / Black", price: 2999, is_enabled: true },
          { id: 103, title: "L / Black", price: 2999, is_enabled: true },
        ],
      },
      {
        id: "mock-product-2",
        title: "Training Kit",
        description: "Training equipment",
        images: [{ src: "https://example.com/training.jpg", is_default: true }],
        variants: [
          { id: 201, title: "One Size", price: 1999, is_enabled: true },
        ],
      },
    ],
  },
  order: {
    id: "mock-order-id",
    external_id: "test-external-id",
    status: "pending",
    created_at: new Date().toISOString(),
  },
  shipping: {
    standard: 499,
    express: 999,
  },
};

/**
 * Weather API (Open-Meteo) Mock Responses
 */
export const weatherResponses = {
  forecast: {
    latitude: 52.52,
    longitude: 13.41,
    timezone: "Europe/London",
    hourly: {
      time: [
        "2025-01-01T09:00",
        "2025-01-01T10:00",
        "2025-01-01T11:00",
        "2025-01-01T12:00",
      ],
      temperature_2m: [12, 14, 15, 16],
      precipitation_probability: [10, 15, 20, 10],
      weathercode: [1, 1, 2, 2],
    },
    daily: {
      time: ["2025-01-01"],
      weathercode: [2],
      temperature_2m_max: [16],
      temperature_2m_min: [8],
      precipitation_sum: [0.5],
    },
  },
};

/**
 * Make.com Webhook Mock Responses
 */
export const makeResponses = {
  success: {
    success: true,
    execution_id: "mock-execution-id",
  },
  queued: {
    success: true,
    queued: true,
    execution_id: "mock-queued-execution-id",
  },
};

/**
 * Resend Email API Mock Responses
 */
export const resendResponses = {
  success: {
    id: "mock-email-id",
    object: "email",
    to: ["recipient@example.com"],
    created_at: new Date().toISOString(),
  },
};

/**
 * Push Notification (Expo) Mock Responses
 */
export const expoPushResponses = {
  success: {
    data: [
      {
        status: "ok",
        id: "mock-receipt-id",
      },
    ],
  },
};

// =============================================================================
// Mock Fetch Interceptor
// =============================================================================

let mockConfigs: MockConfig[] = [];
let stats: MockFetchStats = {
  totalCalls: 0,
  mockHits: 0,
  passThrough: 0,
  calls: [],
};
let originalFetch: typeof fetch | null = null;

/**
 * Default mock configurations for external APIs
 */
export const defaultMockConfigs: MockConfig[] = [
  // Google OAuth Token Refresh
  {
    pattern: /oauth2\.googleapis\.com\/token/,
    handler: () => ({
      body: googleOAuthResponses.tokenRefresh,
      status: 200,
    }),
  },

  // Google User Info
  {
    pattern: /www\.googleapis\.com\/oauth2\/v1\/userinfo/,
    handler: () => ({
      body: googleOAuthResponses.userInfo,
      status: 200,
    }),
  },

  // YouTube Live Broadcasts
  {
    pattern: /googleapis\.com\/youtube\/v3\/liveBroadcasts/,
    handler: (url, options) => {
      if (options?.method === "POST") {
        return { body: youtubeResponses.liveBroadcast, status: 200 };
      }
      return { body: youtubeResponses.bindBroadcast, status: 200 };
    },
  },

  // YouTube Live Streams
  {
    pattern: /googleapis\.com\/youtube\/v3\/liveStreams/,
    handler: () => ({
      body: youtubeResponses.liveStream,
      status: 200,
    }),
  },

  // Printify Products
  {
    pattern: /api\.printify\.com\/v1\/shops\/[^/]+\/products/,
    handler: (url) => {
      if (url.match(/\/products\/[^/]+\.json$/)) {
        return { body: printifyResponses.products.data[0], status: 200 };
      }
      return { body: printifyResponses.products, status: 200 };
    },
  },

  // Printify Orders
  {
    pattern: /api\.printify\.com\/v1\/shops\/[^/]+\/orders/,
    handler: (url) => {
      if (url.includes("/shipping.json")) {
        return { body: printifyResponses.shipping, status: 200 };
      }
      return { body: printifyResponses.order, status: 200 };
    },
  },

  // Weather API (Open-Meteo)
  {
    pattern: /api\.open-meteo\.com\/v1\/forecast/,
    handler: () => ({
      body: weatherResponses.forecast,
      status: 200,
    }),
  },

  // Make.com Webhooks
  {
    pattern: /hook\.(eu\d?|us\d?)\.make\.com/,
    handler: () => ({
      body: makeResponses.success,
      status: 200,
    }),
  },

  // Resend Email API
  {
    pattern: /api\.resend\.com\/emails/,
    handler: () => ({
      body: resendResponses.success,
      status: 200,
    }),
  },

  // Expo Push Notifications
  {
    pattern: /exp\.host\/--\/api\/v2\/push\/send/,
    handler: () => ({
      body: expoPushResponses.success,
      status: 200,
    }),
  },
];

/**
 * Create a mock Response object
 */
function createMockResponse(mockResponse: MockResponse): Response {
  const body =
    typeof mockResponse.body === "string"
      ? mockResponse.body
      : JSON.stringify(mockResponse.body);

  return new Response(body, {
    status: mockResponse.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...mockResponse.headers,
    },
  });
}

/**
 * Install the fetch interceptor
 */
export function installFetchMock(configs: MockConfig[] = defaultMockConfigs): void {
  if (originalFetch) {
    console.warn("Fetch mock already installed. Call uninstallFetchMock first.");
    return;
  }

  originalFetch = globalThis.fetch;
  mockConfigs = configs;
  stats = { totalCalls: 0, mockHits: 0, passThrough: 0, calls: [] };

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";

    stats.totalCalls++;

    // Check for matching mock config
    for (const config of mockConfigs) {
      const pattern = config.pattern;
      const matches =
        typeof pattern === "string"
          ? url.includes(pattern)
          : pattern.test(url);

      if (matches) {
        stats.mockHits++;
        stats.calls.push({ url, method, mocked: true, timestamp: Date.now() });

        const mockResponse = await config.handler(url, init);
        return createMockResponse(mockResponse);
      }
    }

    // No mock matched - pass through to real fetch
    stats.passThrough++;
    stats.calls.push({ url, method, mocked: false, timestamp: Date.now() });

    if (originalFetch) {
      return originalFetch(input, init);
    }

    throw new Error(`No mock for ${method} ${url} and original fetch not available`);
  };
}

/**
 * Uninstall the fetch interceptor
 */
export function uninstallFetchMock(): void {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = null;
  }
  mockConfigs = [];
}

/**
 * Get fetch mock statistics
 */
export function getFetchMockStats(): MockFetchStats {
  return { ...stats };
}

/**
 * Reset fetch mock statistics
 */
export function resetFetchMockStats(): void {
  stats = { totalCalls: 0, mockHits: 0, passThrough: 0, calls: [] };
}

/**
 * Add a custom mock configuration
 */
export function addMockConfig(config: MockConfig): void {
  mockConfigs.unshift(config); // Add to front for priority
}

/**
 * Remove a mock configuration by pattern
 */
export function removeMockConfig(pattern: RegExp | string): void {
  mockConfigs = mockConfigs.filter((c) => c.pattern !== pattern);
}

/**
 * Clear all mock configurations
 */
export function clearMockConfigs(): void {
  mockConfigs = [];
}

// =============================================================================
// Vitest Helper Functions
// =============================================================================

/**
 * Setup function for beforeEach/beforeAll in tests
 */
export function setupExternalApiMocks(): void {
  installFetchMock();
}

/**
 * Teardown function for afterEach/afterAll in tests
 */
export function teardownExternalApiMocks(): void {
  uninstallFetchMock();
  resetFetchMockStats();
}

/**
 * Assert that a specific API was called
 */
export function assertApiCalled(pattern: RegExp | string): void {
  const matches = stats.calls.some((call) => {
    if (typeof pattern === "string") {
      return call.url.includes(pattern);
    }
    return pattern.test(call.url);
  });

  if (!matches) {
    throw new Error(`Expected API matching ${pattern} to be called, but it was not`);
  }
}

/**
 * Assert that a specific API was NOT called
 */
export function assertApiNotCalled(pattern: RegExp | string): void {
  const matches = stats.calls.some((call) => {
    if (typeof pattern === "string") {
      return call.url.includes(pattern);
    }
    return pattern.test(call.url);
  });

  if (matches) {
    throw new Error(`Expected API matching ${pattern} to NOT be called, but it was`);
  }
}

/**
 * Get calls to a specific API
 */
export function getApiCalls(pattern: RegExp | string): MockFetchStats["calls"] {
  return stats.calls.filter((call) => {
    if (typeof pattern === "string") {
      return call.url.includes(pattern);
    }
    return pattern.test(call.url);
  });
}
