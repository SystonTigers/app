# Snapshot Tests

This directory contains snapshot tests that capture and validate API response structures over time.

## What is Snapshot Testing?

Snapshot testing captures the output of your code and stores it in a snapshot file. Future test runs compare the current output against the stored snapshot. If they don't match, the test fails.

### Example:
```typescript
it("snapshots error response", async () => {
  const response = await api.getError();
  expect(response).toMatchSnapshot();
});
```

First run creates: `__snapshots__/test-name.snap`:
```javascript
exports[`snapshots error response 1`] = `
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
`;
```

Future runs compare against this snapshot.

## Why Use Snapshot Testing?

### ✅ Benefits:
1. **Catch Unintended Changes** - Alert when API responses change unexpectedly
2. **Living Documentation** - Snapshots document expected responses
3. **Fast to Write** - No need to manually specify every field
4. **Comprehensive Coverage** - Captures entire response structure
5. **Easy to Review** - Git diffs show exactly what changed

### ⚠️ Limitations:
1. **Can Be Brittle** - Minor changes break tests
2. **Large Snapshots** - Difficult to review
3. **Dynamic Data** - Need to normalize timestamps, IDs, etc.
4. **Not a Replacement** - Still need unit tests for logic

## Test Files

### 1. **error-responses.snapshot.test.ts**
Snapshots error response structures:
- 401 Unauthorized responses
- 404 Not Found responses
- 400 Bad Request responses
- CORS headers on errors
- OPTIONS preflight responses

### 2. **public-api.snapshot.test.ts**
Snapshots public API endpoint responses:
- Public clubs endpoint structure
- Response headers
- API versioning structure

## Running Snapshot Tests

```bash
# Run all snapshot tests
npm run test tests/snapshot/

# Update snapshots (when changes are intentional)
npx vitest run tests/snapshot/ -u

# Update specific snapshot
npx vitest run tests/snapshot/error-responses.snapshot.test.ts -u
```

## Snapshot Files

Snapshots are stored in `__snapshots__/` directories next to test files:

```
tests/snapshot/
├── error-responses.snapshot.test.ts
├── public-api.snapshot.test.ts
└── __snapshots__/
    ├── error-responses.snapshot.test.ts.snap
    └── public-api.snapshot.test.ts.snap
```

**Important**: Commit snapshot files to version control!

## When to Update Snapshots

### ✅ Update snapshots when:
- You intentionally changed the API response structure
- You added new fields to responses
- You improved error messages
- You reviewed the changes and they're correct

### ❌ Don't update snapshots if:
- Tests suddenly started failing
- You haven't reviewed what changed
- The change was unintentional
- Multiple snapshots fail at once (investigate first)

## Best Practices

### 1. Normalize Dynamic Data

Bad:
```typescript
it("snapshots user", async () => {
  const user = await getUser();
  expect(user).toMatchSnapshot();  // ❌ ID, timestamps will always change
});
```

Good:
```typescript
it("snapshots user", async () => {
  const user = await getUser();
  const normalized = {
    hasId: !!user.id,
    email: user.email,
    hasTimestamp: !!user.created_at,
  };
  expect(normalized).toMatchSnapshot();  // ✅ Consistent structure
});
```

### 2. Snapshot Structure, Not Content

Bad:
```typescript
expect(response).toMatchSnapshot();  // ❌ Includes all data
```

Good:
```typescript
const structure = {
  status: response.status,
  hasData: !!response.data,
  dataType: typeof response.data,
  fields: Object.keys(response.data),
};
expect(structure).toMatchSnapshot();  // ✅ Just structure
```

### 3. Use Descriptive Test Names

Bad:
```typescript
it("test 1", async () => { ... });  // ❌ Unclear
```

Good:
```typescript
it("snapshots 401 error response with CORS headers", async () => { ... });  // ✅ Clear
```

### 4. Keep Snapshots Small

Bad:
```typescript
it("snapshots everything", async () => {
  const data = await getAllData();  // 10,000 rows
  expect(data).toMatchSnapshot();  // ❌ Huge, unreadable snapshot
});
```

Good:
```typescript
it("snapshots first item structure", async () => {
  const data = await getAllData();
  const firstItemStructure = {
    count: data.length,
    sampleItem: data[0] ? Object.keys(data[0]) : [],
  };
  expect(firstItemStructure).toMatchSnapshot();  // ✅ Focused
});
```

### 5. Review Snapshot Changes Carefully

When updating snapshots:
1. Run `git diff` on `.snap` files
2. Review every change
3. Ensure changes are intentional
4. Update API documentation if needed
5. Consider if changes are breaking

## Snapshot Testing Workflow

### When a Snapshot Fails:

1. **Investigate Why**
   ```bash
   npx vitest run tests/snapshot/
   # Read the diff carefully
   ```

2. **Determine if Change is Intentional**
   - If YES: Update snapshot
   - If NO: Fix your code

3. **Update Snapshot (if intentional)**
   ```bash
   npx vitest run tests/snapshot/ -u
   ```

4. **Review the Diff**
   ```bash
   git diff tests/snapshot/__snapshots__/
   ```

5. **Commit if Correct**
   ```bash
   git add tests/snapshot/__snapshots__/
   git commit -m "Update snapshots: add new field to user response"
   ```

## Example: Handling Breaking Changes

### Scenario: Adding a new required field

```diff
# Before
{
  "success": true,
  "data": {
    "id": "123",
    "name": "User"
  }
}

# After
{
  "success": true,
  "data": {
    "id": "123",
    "name": "User",
+   "email": "user@example.com"  // New field
  }
}
```

**Steps:**
1. Snapshot test fails ✅ (caught the change)
2. Review: Is this intentional? YES
3. Is this a breaking change for mobile app? NO (additive)
4. Update snapshot: `npx vitest run -u`
5. Update API docs
6. Deploy

### Scenario: Removing a field

```diff
{
  "success": true,
  "data": {
    "id": "123",
    "name": "User",
-   "deprecated_field": "value"  // Removed
  }
}
```

**Steps:**
1. Snapshot test fails ✅
2. Review: Is this intentional? YES
3. **Is this a breaking change? YES** ⚠️
4. Consider:
   - API versioning (`/api/v2/`)
   - Deprecation period
   - Mobile app compatibility
5. Update snapshot only after careful review
6. Coordinate with mobile team

## Integration with CI/CD

Snapshot tests should run in CI/CD:

```yaml
# .github/workflows/ci-backend.yml
- name: Run snapshot tests
  working-directory: ./backend
  run: npm run test tests/snapshot/

- name: Check for snapshot changes
  run: |
    if git diff --exit-code tests/snapshot/__snapshots__/; then
      echo "✅ No unexpected snapshot changes"
    else
      echo "⚠️  Snapshot files changed - review carefully!"
      git diff tests/snapshot/__snapshots__/
    fi
```

## Current Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Error Responses | 5 | ✅ Created |
| Public API | 3 | ✅ Created |
| Authentication | 0 | ⚠️ TODO |
| Videos API | 0 | ⚠️ TODO |
| Events API | 0 | ⚠️ TODO |

## Next Steps

1. Add snapshots for successful responses (with auth)
2. Snapshot pagination structures
3. Snapshot nested objects (events with RSVPs, etc.)
4. Add snapshots for webhook payloads
5. Consider snapshotting email templates

## Related Documentation

- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot.html)
- [Contract Tests](../contract/README.md)
- [API Documentation](../../docs/API.md)

## Tips

### Inline Snapshots

For small snapshots, use inline snapshots:

```typescript
it("snapshots inline", () => {
  const data = { status: 200 };
  expect(data).toMatchInlineSnapshot(`
    {
      "status": 200
    }
  `);
});
```

### Custom Snapshot Serializers

For special objects, create custom serializers:

```typescript
expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val) => `Date(${val.toISOString()})`,
});
```

### Snapshot Diff Tools

Use `jest-snapshot-serializer-ansi` for better diffs:

```bash
npm install -D jest-snapshot-serializer-ansi
```

## Warning Signs

⚠️ **Review carefully if:**
- Multiple snapshots fail at once
- Snapshots fail after refactoring
- Snapshot changes are large
- You're not sure what changed
- CI/CD suddenly fails

✅ **Good sign if:**
- Only expected snapshots change
- Changes match your PR description
- Diff is small and clear
- Changes are additive (new fields)
