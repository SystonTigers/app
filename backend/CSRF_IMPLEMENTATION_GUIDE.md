# CSRF Protection Implementation Guide

## ✅ What's Already Done

1. **CSRF Service** (`src/services/csrf.ts`) - Complete implementation of double-submit cookie pattern
2. **CSRF Middleware** (`src/middleware/csrf.ts`) - Easy-to-use middleware wrapper
3. **Tests** (`src/services/__tests__/csrf.test.ts`) - Unit tests for CSRF service

## 🔴 What Needs To Be Done

CSRF protection must be added to all web admin routes that modify data (POST, PUT, PATCH, DELETE).

### Priority Routes Requiring CSRF

**CRITICAL (Do First):**
1. `routes/admin.ts` - Admin operations (create/delete tenants, promo codes)
2. `routes/tenants.ts` - Tenant management
3. `routes/provisioning.ts` - Tenant provisioning
4. `routes/signup.ts` - User registration

**HIGH:**
5. `routes/auth.ts` - Authentication endpoints
6. `routes/events.ts` - Event creation/modification
7. `routes/content.ts` - Content management
8. `routes/shop.ts` - E-commerce operations

**MEDIUM:**
9. `routes/videos.ts` - Video uploads (if from web)
10. `routes/gallery.ts` - Gallery uploads (if from web)
11. `routes/fixtures.ts` - Fixture management
12. `routes/training.ts` - Training session management

**Note:** Mobile API endpoints (starting with `/api/v1/`) don't need CSRF since they use JWT auth.

---

## 📖 Implementation Steps

### Step 1: Add CSRF Middleware to Route Handlers

**Before:**
```typescript
export async function handleCreateTenant(req: Request, env: Env, claims: JWTClaims) {
  const body = await req.json();
  
  // Create tenant logic...
}
```

**After:**
```typescript
import { withCsrfProtection } from "../middleware/csrf";

export async function handleCreateTenant(req: Request, env: Env, claims: JWTClaims) {
  const body = await req.json();
  
  // ✅ CSRF Protection
  await withCsrfProtection(req, env, body, claims.userId);
  
  // Create tenant logic...
}
```

### Step 2: Generate CSRF Tokens for Forms

**In your admin page HTML generation:**

```typescript
import { generateCsrfForForm } from "../middleware/csrf";

async function renderAdminForm(req: Request, env: Env, userId: string) {
  // Generate CSRF token
  const { token, cookieHeader } = await generateCsrfForForm(env, userId);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <form method="POST" action="/admin/create-tenant">
          <input type="hidden" name="csrf_token" value="${token}" />
          <!-- Other form fields -->
          <button type="submit">Create Tenant</button>
        </form>
      </body>
    </html>
  `;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Set-Cookie': cookieHeader,
    }
  });
}
```

### Step 3: Send CSRF Token from Web Admin Frontend

**For AJAX requests (Next.js admin panel):**

```typescript
// In web-app, get token from cookie
function getCsrfToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// Include in fetch requests
async function createTenant(data) {
  const response = await fetch('/admin/create-tenant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken(), // ✅ Include CSRF token
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Step 4: Test CSRF Protection

```bash
# Should fail without token:
curl -X POST https://your-app.workers.dev/admin/create-tenant \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tenant"}'
# Expected: 403 Forbidden

# Should succeed with valid token:
curl -X POST https://your-app.workers.dev/admin/create-tenant \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -H "Cookie: csrf_token=abc123..." \
  -d '{"name": "Test Tenant"}'
# Expected: 200 OK
```

---

## 🎯 Example: Protecting admin.ts

### File: `backend/src/routes/admin.ts`

Find all POST/PUT/PATCH/DELETE handlers and add CSRF:

```typescript
// At the top of the file:
import { withCsrfProtection } from "../middleware/csrf";

// In each state-changing handler:
export async function handleCreateTenant(req: Request, env: Env, claims: JWTClaims) {
  const body = await req.json();
  
  // ✅ Add this line
  await withCsrfProtection(req, env, body, claims.userId);
  
  // ... rest of handler
}

export async function handleDeleteTenant(req: Request, env: Env, claims: JWTClaims) {
  const body = await req.json();
  
  // ✅ Add this line
  await withCsrfProtection(req, env, body, claims.userId);
  
  // ... rest of handler
}

// Do the same for all POST, PUT, PATCH, DELETE handlers
```

---

## 🧪 Testing Checklist

- [ ] CSRF token generated on form load
- [ ] Cookie set with SameSite=Strict
- [ ] Token included in form submission (hidden field or header)
- [ ] Valid token → request succeeds
- [ ] Missing token → 403 error
- [ ] Invalid token → 403 error
- [ ] Token from different session → 403 error
- [ ] Mobile API endpoints still work without CSRF

---

## 📊 Progress Tracking

**Status:** 🟡 In Progress

- [x] CSRF service implemented
- [x] CSRF middleware created
- [x] Documentation written
- [ ] admin.ts protected
- [ ] tenants.ts protected
- [ ] provisioning.ts protected
- [ ] signup.ts protected
- [ ] auth.ts protected
- [ ] Other routes protected
- [ ] Web admin frontend updated
- [ ] Integration tests added
- [ ] Production deployment

---

## ⚠️ Important Notes

1. **Mobile API Exception:** Routes under `/api/v1/` should NOT require CSRF (they use JWT auth instead)
2. **SameSite Cookies:** CSRF cookies use `SameSite=Strict` for security
3. **Token Lifetime:** Tokens expire after 1 hour
4. **Logout:** Clear CSRF tokens on logout using `clearCsrfTokens()`
5. **Development:** CSRF works in development, but logs warnings

---

## 🚀 Quick Start

**To protect a route right now:**

```typescript
// 1. Import middleware
import { withCsrfProtection } from "../middleware/csrf";

// 2. Add to handler (before any data modification)
await withCsrfProtection(req, env, body, sessionId);

// 3. Update frontend to send token
headers: { 'X-CSRF-Token': getCsrfToken() }

// Done! Route is now protected.
```

---

**Next Steps:** Implement CSRF on all admin routes listed above, starting with `admin.ts`.
