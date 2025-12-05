# E2E Tests - Critical User Journeys

This directory contains end-to-end tests for the complete user journeys through the application.

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

✅ **Environment setup partially fixed** - Removed `beforeEach` hooks, now using 'syston' tenant

⚠️ **10 out of 20 tests passing** - Test fixtures and database seeding still needed

### Issues Fixed
- ✅ Removed `beforeEach` hooks that accessed `env.KV_IDEMP`
- ✅ Changed all tests to use 'syston' tenant from fixtures
- ✅ Each test now registers its own user within the test

### Remaining Issues

1. **Test fixtures not loaded** - The 'syston' tenant doesn't exist in test environment
   ```
   Registration returns 500 or empty auth tokens
   ```

2. **Database tables missing** - Test database not seeded with schema
   ```
   D1_ERROR: no such table: matches: SQLITE_ERROR
   ```

3. **Solution needed**: Set up proper test fixtures that seed:
   - Tenant data ('syston' tenant in KV_IDEMP)
   - Database schema (matches, users, events, etc.)
   - Test environment bindings

### Solutions

**Option 1: Use Test Fixtures** (Recommended)
- Create test fixture files that seed the database/KV with test data
- Use the `syston` tenant which is already seeded in test fixtures
- Remove `beforeEach` hooks that try to create tenant data

**Option 2: Mock Environment Bindings**
- Create mock implementations of KV, D1, R2 bindings
- Use vitest's `vi.mock()` to inject mocked bindings

**Option 3: Integration Test Approach**
- Use real database seeded with test data
- Run tests against a test environment with proper bindings
- Clean up data after each test run

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
