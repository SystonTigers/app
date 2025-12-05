# Contract Tests

This directory contains contract tests that validate the API responses match the structure expected by the mobile application.

## What is Contract Testing?

Contract testing ensures that the backend API maintains a consistent interface (contract) with its consumers (the mobile app). These tests:

1. **Validate response structure** - Ensure all expected fields are present
2. **Check field types** - Verify data types match expectations
3. **Prevent breaking changes** - Alert when API structure changes
4. **Document the API** - Serve as living documentation of the API contract

## Why Contract Testing Matters

### Without Contract Testing:
```typescript
// Backend changes response structure
{ data: { token: "..." } }  // Was this
↓
{ token: "..." }  // Changed to this

// Mobile app breaks because it expects data.token
❌ Mobile app crashes
```

### With Contract Testing:
```typescript
// Contract test fails immediately
✅ Developer is alerted to breaking change
✅ Can fix before deploying
✅ Mobile app continues working
```

## Test Files

### 1. **auth-contract.test.ts**
Tests authentication API contract:
- `POST /api/v1/auth/register` - Registration response structure
- `POST /api/v1/auth/login` - Login response structure
- `GET /api/v1/auth/me` - User profile structure
- Error response structures (401, 400, etc.)

### 2. **videos-contract.test.ts**
Tests video API contract:
- `GET /api/v1/videos` - Video list response structure
- `POST /api/v1/videos/upload` - Upload response structure
- Video object structure validation
- Processing status fields

### 3. **events-contract.test.ts**
Tests event API contract:
- `GET /api/v1/events` - Event list response structure
- `POST /api/v1/events` - Event creation response
- `POST /api/v1/events/:id/rsvp` - RSVP response structure
- Event object structure validation

## Running Contract Tests

```bash
# Run all contract tests
npm run test tests/contract/

# Run specific contract test
npx vitest run tests/contract/auth-contract.test.ts

# Run in watch mode during development
npx vitest tests/contract/
```

## Expected Response Structures

### Standard Success Response
```typescript
{
  success: true,
  data: {
    // Response data here
  }
}
```

### Standard Error Response
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    requestId: "req-123",  // Optional
    details: {}  // Optional additional details
  }
}
```

### Authentication Response
```typescript
{
  success: true,
  data: {
    token: "jwt-token-here",
    userId: "user-123",  // Optional
    user: {  // Optional user object
      id: "user-123",
      email: "user@example.com",
      profile: { name: "User Name" }
    }
  }
}
```

### Video Object
```typescript
{
  id: "video-123",
  tenant_id: "syston",
  filename: "match.mp4",
  size: 50000000,
  status: "processing" | "ready" | "failed",
  created_at: 1234567890,
  metadata?: {
    duration: 3600,
    resolution: "1080p"
  }
}
```

### Event Object
```typescript
{
  id: "event-123",
  tenant_id: "syston",
  title: "Team Training",
  description: "Weekly training session",
  event_type: "training" | "match" | "social",
  start_time: "2024-12-04T10:00:00Z",
  end_time: "2024-12-04T12:00:00Z",
  location: "Main Field",
  created_by: "user-123",
  created_at: 1234567890,
  rsvp_count?: {
    going: 15,
    not_going: 3,
    maybe: 2
  }
}
```

## Writing New Contract Tests

When adding a new API endpoint, create a contract test:

```typescript
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

describe("Contract: New API", () => {
  it("validates response structure", async () => {
    const request = new Request("https://example.com/api/v1/new-endpoint");
    const response = await worker.fetch(request, env);
    const data = await response.json() as any;

    // Contract validation
    expect(data).toHaveProperty("success");
    expect(typeof data.success).toBe("boolean");

    if (data.success) {
      expect(data).toHaveProperty("data");
      // Validate data structure
    } else {
      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("code");
      expect(data.error).toHaveProperty("message");
    }
  });
});
```

## Contract Testing Best Practices

### ✅ DO:
- Test the structure, not the content
- Validate all required fields are present
- Check data types of fields
- Test both success and error responses
- Test all status codes (200, 400, 401, 404, 500)
- Document expected structures in comments
- Update tests when API changes intentionally

### ❌ DON'T:
- Test business logic (that's for unit tests)
- Test exact values (except for enums/constants)
- Test database state (that's for integration tests)
- Make tests dependent on external services
- Test implementation details

## Examples

### Good Contract Test:
```typescript
it("validates user object structure", () => {
  const user = mockUserResponse.data.user;

  // Structure validation
  expect(user).toHaveProperty("id");
  expect(user).toHaveProperty("email");
  expect(user).toHaveProperty("profile");

  // Type validation
  expect(typeof user.id).toBe("string");
  expect(typeof user.email).toBe("string");
  expect(typeof user.profile).toBe("object");
});
```

### Bad Contract Test:
```typescript
it("user email is valid", () => {
  const user = mockUserResponse.data.user;

  // ❌ Testing business logic, not contract
  expect(user.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);

  // ❌ Testing exact values
  expect(user.id).toBe("user-123");
});
```

## Contract Versioning

When making breaking changes to the API:

1. **Identify the breaking change**
   ```typescript
   // Breaking: Removed field
   { data: { token: "...", userId: "..." } }
   ↓
   { data: { token: "..." } }  // userId removed
   ```

2. **Update contract tests first** (they should fail)
   ```typescript
   // Test now fails - good!
   expect(data.data).toHaveProperty("userId");
   ```

3. **Consider versioning**
   - Add new endpoint: `/api/v2/auth/login`
   - Deprecate old endpoint
   - Update mobile app to use v2
   - Remove v1 after transition period

4. **Update mobile app**
   - Mobile team updates their code
   - Deploy mobile app update
   - Then deploy backend changes

## Integration with CI/CD

Contract tests run in CI/CD pipeline to catch breaking changes:

```yaml
# .github/workflows/ci-backend.yml
- name: Run contract tests
  working-directory: ./backend
  run: npm run test tests/contract/

- name: Fail on breaking changes
  if: failure()
  run: |
    echo "⚠️  Contract tests failed - potential breaking change!"
    echo "Review API changes before deploying"
    exit 1
```

## Current Coverage

| API Category | Endpoints Tested | Status |
|--------------|------------------|--------|
| Authentication | 3 | ✅ Covered |
| Videos | 2 | ✅ Covered |
| Events | 3 | ✅ Covered |
| Matches | 0 | ⚠️ TODO |
| Players | 0 | ⚠️ TODO |
| Training | 0 | ⚠️ TODO |
| Social Media | 0 | ⚠️ TODO |

## Next Steps

1. Add contract tests for remaining endpoints
2. Set up contract test monitoring in CI/CD
3. Create API changelog for tracking breaking changes
4. Consider using tools like Pact for consumer-driven contracts
5. Generate OpenAPI/Swagger docs from contract tests

## Related Documentation

- [API Documentation](../../docs/API.md) (if exists)
- [Testing Guide](../TESTING.md)
- [Mobile App Integration](../../docs/MOBILE.md) (if exists)
- [Pact - Consumer-Driven Contracts](https://pact.io/)
