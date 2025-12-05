# E2E Tests - Critical User Journeys

This directory contains end-to-end tests for the complete user journeys through the application.

## Quick Start

```bash
# 1. Seed the test database
npx wrangler d1 execute DB --local --file=./tests/e2e/fixtures/test-seed.sql

# 2. Run all E2E tests
npm test tests/e2e/

# 3. Run specific journey
npx vitest run tests/e2e/auth-journey.e2e.test.ts
```

## Test Files Created

### 1. **auth-journey.e2e.test.ts**
Tests the complete authentication flow:
- User registration
- Login with credentials
- Token validation
- Authenticated API access
- Invalid credentials handling
- Unauthorized access rejection

### 2. **video-upload-journey.e2e.test.ts**
Tests the video upload and processing workflow:
- Request upload URL
- Upload video metadata
- Trigger highlight processing
- Check processing status
- Retrieve processed highlights
- Video deletion

### 3. **event-management-journey.e2e.test.ts**
Tests the event lifecycle:
- Create event
- List events
- RSVP to event
- View attendees
- Update event status
- RSVP status changes (going/not going/maybe)

### 4. **match-day-journey.e2e.test.ts**
Tests the match day workflow:
- Create match
- Update match score/events
- View live match updates
- Initiate MOTM (Man of the Match) voting
- Cast votes
- View voting results
- Prevent duplicate votes

### 5. **social-media-journey.e2e.test.ts**
Tests the social media management workflow:
- Configure social media accounts (Twitter, Facebook, Instagram)
- Create social posts
- Schedule posts
- View post history
- Delete posts
- Validate post content
- Handle immediate vs scheduled posts

## Test Coverage

**Total E2E Tests**: 20 tests across 5 critical journeys

| Journey | Tests | Passing | Status |
|---------|-------|---------|--------|
| Authentication | 3 | 2/3 | ⚠️ Needs fixtures |
| Video Upload | 4 | 2/4 | ⚠️ Needs fixtures |
| Event Management | 4 | 2/4 | ⚠️ Needs fixtures |
| Match Day | 4 | 1/4 | ⚠️ Needs fixtures + DB |
| Social Media | 5 | 3/5 | ⚠️ Needs fixtures |

## Current Status

✅ **Environment setup complete** - Test fixtures and utilities created

### Setup Components

1. **Test Fixtures** (`./fixtures/test-seed.sql`)
   - Seeds 'syston' tenant with ID matching `TEST_TENANT.id`
   - Creates test admin user, events, matches, and feed posts
   - Run once before testing: `npx wrangler d1 execute DB --local --file=./tests/e2e/fixtures/test-seed.sql`

2. **Test Utilities** (`./vitest.setup.ts`)
   - `TEST_TENANT` - Consistent tenant configuration
   - `generateTestEmail()` - Unique emails for each test
   - `generateIdempotencyKey()` - Unique idempotency keys
   - `createMockContext()` - Worker execution context
   - `createTestRequest()` - Request builder with auth headers

### How to Run

```bash
# First time setup
cd backend
npm install
npx wrangler d1 execute DB --local --file=./tests/e2e/fixtures/test-seed.sql

# Run all E2E tests
npm test tests/e2e/

# Run with verbose output
npx vitest run tests/e2e/ --reporter=verbose
```

### Troubleshooting

**"no such table" errors**
```bash
# Apply all migrations first
npx wrangler d1 migrations apply DB --local
npx wrangler d1 execute DB --local --file=./tests/e2e/fixtures/test-seed.sql
```

**"tenant not found" errors**
- Ensure test-seed.sql was run successfully
- Check that TEST_TENANT.id matches seed file

## Running E2E Tests

Once environment is configured:

```bash
# Run all E2E tests
npm run test tests/e2e/

# Run specific journey
npx vitest run tests/e2e/auth-journey.e2e.test.ts

# Run with coverage
npx vitest run tests/e2e/ --coverage
```

## Test Structure

Each E2E test follows this pattern:

```typescript
describe("E2E: Journey Name", () => {
  // Setup (needs fixing - see above)

  it("tests complete workflow end-to-end", async () => {
    // Step 1: Initial action
    // Step 2: Dependent action
    // Step 3: Verification
    // Assertions throughout
  });

  it("tests error cases", async () => {
    // Authentication failures
    // Validation errors
    // Edge cases
  });
});
```

## Next Steps

1. **Fix environment setup** - Choose and implement one of the solutions above
2. **Run tests** - Verify all 20 E2E tests pass
3. **Add to CI/CD** - Include E2E tests in GitHub Actions workflow
4. **Extend coverage** - Add more user journeys as needed:
   - Gallery management
   - Player management
   - Training session management
   - Admin operations

## Best Practices

- **Isolation**: Each test should be independent
- **Cleanup**: Clean up test data after each run
- **Realistic**: Use realistic data and flows
- **Assertions**: Test both happy paths and error cases
- **Documentation**: Document what each test verifies

## Related Documentation

- [Testing Guide](../../TESTING.md)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/)
- [Vitest Integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
