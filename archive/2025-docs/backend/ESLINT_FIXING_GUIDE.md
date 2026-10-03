# ESLint Issues - Fixing Guide

## Current Status

**Total Issues:** 1,948  
- **Errors:** 920  
- **Warnings:** 1,028  
- **Auto-fixable:** 188

## What Changed

Enabled strict TypeScript ESLint rules:
- ✅ `no-explicit-any`: "error" (was "off")
- ✅ `explicit-function-return-type`: "warn"
- ✅ `explicit-module-boundary-types`: "warn"
- ✅ `no-console`: "warn" (was "off")
- ✅ Added async/promise rules
- ✅ Added security rules

## Auto-Fix First

Run this to automatically fix 188 issues:

```bash
cd backend
npm run lint -- --fix
```

This will fix:
- Spacing and formatting
- `prefer-const` violations
- Some unused variable issues

## Manual Fixes Required

### 1. Replace `any` types (920 errors)

**Bad:**
```typescript
function handleRequest(req: any, env: any): any {
  // ...
}
```

**Good:**
```typescript
import type { Env } from "./types";

function handleRequest(req: Request, env: Env): Promise<Response> {
  // ...
}
```

### 2. Add return types (1,028 warnings)

**Bad:**
```typescript
async function getTenant(id: string) {
  return await db.query(...);
}
```

**Good:**
```typescript
async function getTenant(id: string): Promise<Tenant | null> {
  return await db.query(...);
}
```

### 3. Replace `console.log` with `logJSON`

**Bad:**
```typescript
console.log("Processing request");
```

**Good:**
```typescript
import { logJSON } from "./lib/log";
logJSON({ level: "info", msg: "processing_request" });
```

## Priority Order

1. **Phase 1 (Week 1):** Auto-fix + critical security files
   - Run `--fix`
   - Fix `any` types in:
     - `middleware/rateLimit.ts` ✅ (already done)
     - `middleware/csrf.ts`
     - `services/auth.ts`
     - `services/csrf.ts`

2. **Phase 2 (Week 2):** Core routes
   - Fix `any` in all `routes/*.ts`
   - Add return types to public APIs

3. **Phase 3 (Week 3):** Services and utilities
   - Fix `services/*.ts`
   - Fix `lib/*.ts`

4. **Phase 4 (Week 4):** Polish
   - Add return types everywhere
   - Remove all `console.log`
   - Final cleanup

## Common Patterns

### Pattern: Database Query Results

**Before:**
```typescript
const result: any = await env.DB.prepare(query).all();
```

**After:**
```typescript
interface TenantRow {
  id: string;
  name: string;
  email: string;
  // ... other fields
}

const result = await env.DB.prepare(query).all<TenantRow>();
```

### Pattern: Request Handlers

**Before:**
```typescript
async function handler(req: Request, env: any) {
  const body: any = await req.json();
}
```

**After:**
```typescript
interface CreateTenantBody {
  name: string;
  email: string;
}

async function handler(req: Request, env: Env): Promise<Response> {
  const body = await req.json() as CreateTenantBody;
  // Or use zod validation:
  const body = parse(CreateTenantSchema, await req.json());
}
```

### Pattern: Error Handling

**Before:**
```typescript
} catch (err: any) {
  console.log(err);
}
```

**After:**
```typescript
} catch (err: unknown) {
  logJSON({
    level: "error",
    msg: "operation_failed",
    error: err instanceof Error ? err.message : String(err)
  });
}
```

## Tracking Progress

Create issues for each file that needs fixing:

```bash
# See issues by file:
npm run lint -- --format=json > lint-results.json

# Count issues per file:
npm run lint | grep -oP '^\S+' | sort | uniq -c | sort -rn
```

## Goal

**Target:** < 50 total issues  
**Timeline:** 4 weeks  
**Current:** 1,948 issues  
**Reduction needed:** 1,898 issues (97%)

## Quick Wins

These files have the most `any` types (fix these first):

1. `src/index.ts` - The monolithic file
2. `src/routes/admin.ts`
3. `src/routes/signup.ts`
4. `src/routes/public.ts`
5. `src/services/googleAuth.ts`

Fixing these 5 files will eliminate ~40% of issues.
