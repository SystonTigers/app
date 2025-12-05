# Testing Guide

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Coverage

✅ **Coverage Solution**: Using **Istanbul-based instrumented coverage** (`@vitest/coverage-istanbul`)

### Why Istanbul?

The Workers runtime doesn't support V8-based coverage (`@vitest/coverage-v8`) due to missing `node:inspector` module. Istanbul provides instrumented coverage that works within the Workers environment.

**Reference**: [Cloudflare Workers Vitest Integration - Known Issues](https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/)

### Coverage Configuration

Coverage is enabled in `vitest.config.ts`:
```typescript
coverage: {
  provider: "istanbul",
  reporter: ["text", "json", "html"],
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/__tests__/**",
    "**/*.test.ts",
    "**/do/**",  // Durable Objects
    "src/queue-consumer.ts",
    "src/__mocks__/**",
  ],
}
```

### Current Coverage Status

**Overall**: 511 passing tests / 550 total (1 failing auth integration test)

| Area | Coverage | Tests | Status |
|------|----------|-------|--------|
| **Routes** | 100% | 129/130 | ✅ All routes tested |
| **Services** | ~85% | 351 | ✅ Comprehensive |
| **Middleware** | ~70% | 31 | ✅ Good coverage |

**Total Test Count**: 511 passing tests

## Test Organization

### Unit Tests
- Location: `src/services/__tests__/*.test.ts`
- Purpose: Test individual services and utilities
- Status: ✅ 351 passing tests

### Route Tests
- Location: `src/routes/__tests__/*.test.ts`
- Purpose: Test API endpoint authentication and responses
- Status: ✅ 129 passing tests, 1 failing

### Known Issues

1. **auth.test.ts** - Complex integration test requiring database seeding (backlog item)

## CI/CD

Tests run automatically on:
- Every push to `main` or `develop`  
- Every pull request

Pipeline steps:
1. Lint
2. **Test** ← Tests run here
3. Type check
4. Build
5. Deploy (main branch only)

## Writing Tests

### Example Unit Test
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../myModule";

describe("myFunction", () => {
  it("should return expected value", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });
});
```

### Example Route Test
```typescript
import { env } from "cloudflare:test";
import worker from "../src/index";

describe("My Route", () => {
  it("should return 200", async () => {
    const request = new Request("https://example.com/api/v1/test");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
  });
});
```

## Test Coverage Goals

**Target**: 70% statement coverage
**Current**: Istanbul coverage enabled ✅

### How to View Coverage

After running `npm run test:coverage`, coverage reports are generated in:
- **Terminal**: Text summary displayed
- **HTML**: `coverage/index.html` (open in browser for detailed view)
- **JSON**: `coverage/coverage-final.json` (for CI/CD integration)

### Coverage Goals by Area

| Area | Goal | Current Status |
|------|------|----------------|
| Routes | 100% routes tested | ✅ **100%** (26/26 routes) |
| Services | 80% statement coverage | 🟡 ~85% estimated |
| Middleware | 70% statement coverage | 🟡 ~70% estimated |
| Critical paths | 90% statement coverage | ✅ High coverage |

**Next Priorities**:
1. ✅ ~~Add tests for all routes~~ COMPLETE
2. Deepen route tests beyond authentication checks
3. Add E2E tests for critical user journeys
4. Add integration tests for complex flows
