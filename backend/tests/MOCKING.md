# External Dependency Mocking

This document outlines the external dependencies in the application and strategies for mocking them in tests.

## Identified External Dependencies

### 1. **Resend API** (Email Service)
**Location**: `src/lib/email.ts`

**API Endpoint**: `https://api.resend.com/emails`

**Purpose**: Sends transactional emails (magic links, welcome emails, notifications)

**Current Behavior**:
- If `RESEND_API_KEY` is not configured, returns success without sending
- Useful for development, but tests should verify email content

**Mocking Strategy**:
```typescript
// src/__mocks__/email.ts
export async function sendEmail(options: EmailOptions, env: any): Promise<EmailResult> {
  // Mock implementation that captures email details for testing
  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
}
```

**Test Cases to Add**:
- Email content validation
- Email recipient verification
- Subject line testing
- HTML template rendering

---

### 2. **Open-Meteo API** (Weather Service)
**Location**: `src/services/weather.ts`

**API Endpoint**: `https://api.open-meteo.com/v1/forecast`

**Purpose**: Provides weather forecasts for training/match day planning

**Current Status**: No mocking - makes real API calls in tests

**Mocking Strategy**:
```typescript
// src/__mocks__/weather.ts
export const getWeather = async (req: any) => {
  return new Response(
    JSON.stringify({
      hourly: {
        temperature_2m: [15, 16, 17, 18],
        precipitation_probability: [10, 15, 20, 25],
      },
      daily: {
        weathercode: [1],
        temperature_2m_max: [20],
        temperature_2m_min: [10],
      },
    }),
    { headers: { "content-type": "application/json" } }
  );
};
```

**Test Cases to Add**:
- Valid coordinates handling
- Missing coordinates (400 error)
- Weather data parsing
- Temperature unit conversions

---

### 3. **YouTube API** (Live Streaming)
**Location**: `src/adapters/youtube.ts`

**API Endpoints**:
- `https://oauth2.googleapis.com/token` (OAuth refresh)
- `https://www.googleapis.com/youtube/v3/liveBroadcasts` (Create broadcast)
- `https://www.googleapis.com/youtube/v3/liveStreams` (Create stream)

**Purpose**: Creates and manages YouTube live streams for matches

**Current Status**: No mocking - would fail in tests without credentials

**Mocking Strategy**:
```typescript
// src/__mocks__/youtube.ts
export async function publishYouTube(env: any, tenant: any, template: string, data: Record<string, unknown>) {
  return {
    ok: true,
    watch_url: "https://www.youtube.com/watch?v=mock-broadcast-id",
    broadcast_id: "mock-broadcast-id",
    stream_id: "mock-stream-id",
    start_iso: data.start_iso || new Date().toISOString(),
  };
}
```

**Test Cases to Add**:
- Broadcast creation with various privacy settings
- OAuth token refresh handling
- Stream binding verification
- Error handling for missing credentials

---

### 4. **Google OAuth API**
**Location**: `src/services/googleAuth.ts`

**API Endpoint**: `https://oauth2.googleapis.com/token`

**Purpose**: Authenticates users with Google accounts, refreshes access tokens

**Mocking Strategy**:
```typescript
// Mock Google OAuth token refresh
globalThis.fetch = async (url, options) => {
  if (url === "https://oauth2.googleapis.com/token") {
    return new Response(
      JSON.stringify({
        access_token: "mock-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      }),
      { status: 200 }
    );
  }
  return originalFetch(url, options);
};
```

---

### 5. **Push Notification Services**
**Location**: `src/services/push.ts`

**Purpose**: Sends push notifications to mobile devices

**Current Status**: Likely uses external service (FCM, APNs, or similar)

**Mocking Strategy**: TBD - needs investigation of which service is used

---

### 6. **Make.com Webhooks**
**Location**: `src/adapters/make.ts`

**Purpose**: Integrates with Make.com (formerly Integromat) for automation workflows

**Mocking Strategy**:
```typescript
// Mock webhook POST requests
globalThis.fetch = async (url, options) => {
  if (url.includes("hook.eu2.make.com")) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  }
  return originalFetch(url, options);
};
```

---

## Mocking Implementation Strategies

### Strategy 1: Module Mocking (Recommended)
Use Vitest's `vi.mock()` to mock entire modules:

```typescript
import { vi } from "vitest";

vi.mock("../lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: "mock-id",
  }),
}));
```

**Pros**:
- Clean and explicit
- Easy to customize per test
- Type-safe with proper typing

**Cons**:
- Must mock in each test file
- Can be verbose

---

### Strategy 2: Global Fetch Interception
Override `globalThis.fetch` in test setup:

```typescript
// vitest.setup.ts
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  const urlStr = String(url);

  // Resend API
  if (urlStr.includes("api.resend.com")) {
    return new Response(
      JSON.stringify({ id: "mock-email-id" }),
      { status: 200 }
    );
  }

  // Weather API
  if (urlStr.includes("open-meteo.com")) {
    return new Response(
      JSON.stringify({ hourly: {}, daily: {} }),
      { status: 200 }
    );
  }

  // Pass through other requests
  return originalFetch(url, options);
};
```

**Pros**:
- Centralized configuration
- Applies to all tests automatically
- Easier to maintain

**Cons**:
- Less explicit
- Harder to customize per test
- Global state can cause test pollution

---

### Strategy 3: Conditional Mocking (Current Approach)
Some services already check for missing credentials:

```typescript
if (!env.RESEND_API_KEY) {
  return { success: true, messageId: "dev-mode-no-send" };
}
```

**Pros**:
- No test setup needed
- Works in development and tests

**Cons**:
- Tests don't verify actual behavior
- Can't test error scenarios
- Hides potential bugs

---

## Recommended Implementation Plan

### Phase 1: Critical External Services (High Priority)
1. ✅ Email service (Resend) - Already handled via missing API key
2. ⚠️ Weather API - Should mock to avoid rate limits
3. ⚠️ YouTube API - Must mock (requires credentials)
4. ⚠️ Google OAuth - Must mock (requires credentials)

### Phase 2: Secondary Services (Medium Priority)
5. Push notifications
6. Make.com webhooks
7. Google Sheets API (if used)

### Phase 3: Enhancement (Low Priority)
8. Add test coverage for mocked services
9. Create mock data generators
10. Add integration test mode with real APIs (optional)

---

## Example: Mocking in Tests

### Example 1: Email Service Test
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../lib/email";

// Mock at module level
vi.mock("../lib/email");

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends welcome email", async () => {
    const mockSendEmail = vi.mocked(sendEmail);
    mockSendEmail.mockResolvedValue({
      success: true,
      messageId: "test-id",
    });

    const result = await sendEmail(
      {
        to: "test@example.com",
        subject: "Welcome!",
        html: "<p>Welcome</p>",
      },
      { RESEND_API_KEY: "test-key" }
    );

    expect(result.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Welcome!",
      }),
      expect.any(Object)
    );
  });
});
```

### Example 2: Weather API Test
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getWeather } from "../services/weather";

describe("Weather Service", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes("open-meteo.com")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              hourly: { temperature_2m: [15, 16, 17] },
              daily: { weathercode: [1] },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });
  });

  it("fetches weather for coordinates", async () => {
    const req = new Request("https://example.com/weather?lat=51.5&lon=-0.1");
    const response = await getWeather(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hourly).toBeDefined();
  });
});
```

---

## Current Mock Status

| Service | Status | Priority | Action Needed |
|---------|--------|----------|---------------|
| Email (Resend) | ✅ Handled | High | None (conditional logic exists) |
| Weather (Open-Meteo) | ❌ Not Mocked | High | Create mock or global fetch intercept |
| YouTube API | ❌ Not Mocked | High | Create module mock |
| Google OAuth | ❌ Not Mocked | High | Create global fetch intercept |
| Push Notifications | ❌ Not Mocked | Medium | Investigate service, then mock |
| Make.com Webhooks | ❌ Not Mocked | Medium | Create global fetch intercept |
| DOMPurify | ✅ Mocked | N/A | `src/__mocks__/dompurify.ts` exists |

---

## Benefits of Proper Mocking

1. **Faster Tests**: No network calls = faster execution
2. **Reliability**: Tests don't fail due to network issues or API rate limits
3. **Offline Development**: Work without internet connection
4. **Predictability**: Consistent responses every time
5. **Security**: No need to expose real API keys in tests
6. **Cost**: Avoid charges from pay-per-use APIs

---

## Next Steps

1. Create `__mocks__` directory structure for each external service
2. Implement global fetch interceptor in `vitest.setup.ts`
3. Add tests that verify mocked behavior
4. Document expected responses for each external API
5. Consider using libraries like `msw` (Mock Service Worker) for more sophisticated mocking

---

## Related Documentation

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Cloudflare Workers fetch() API](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
