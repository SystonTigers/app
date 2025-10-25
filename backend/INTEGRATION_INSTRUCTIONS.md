# Backend Integration Instructions for Phase 3 Routes

## Files Created
- `src/routes/signup.ts` - 4 signup route handlers
- `src/routes/usage.ts` - 2 usage tracking route handlers
- `src/routes/admin.ts` - 6 admin/owner console route handlers

## Integration Steps for index.ts

### Step 1: Add imports
After line 23 (after `import { healthz, readyz } from "./routes/health";`), add:
```typescript
import { signupStart, signupBrand, signupStarterMake, signupProConfirm } from "./routes/signup";
import { getUsage, incrementUsage } from "./routes/usage";
import { listTenants, getTenant, updateTenant, listPromoCodes, createPromoCode, getAdminStats } from "./routes/admin";
```

### Step 2: Add signup route handlers
After line 220 (after the existing signup route closes with `}`), before the "Apps Script Integration" comment, add:

```typescript
    // -------- Self-Serve Signup System (Phase 3) --------

    // POST /public/signup/start
    if (url.pathname === `/public/signup/start` && req.method === "POST") {
      try {
        const res = await signupStart(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /public/signup/brand
    if (url.pathname === `/public/signup/brand` && req.method === "POST") {
      try {
        const res = await signupBrand(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /public/signup/starter/make
    if (url.pathname === `/public/signup/starter/make` && req.method === "POST") {
      try {
        const res = await signupStarterMake(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /public/signup/pro/confirm
    if (url.pathname === `/public/signup/pro/confirm` && req.method === "POST") {
      try {
        const res = await signupProConfirm(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }
```

## Testing Commands

After integration, rebuild and deploy:
```bash
cd "G:\My Drive\Final Products\OA App\applatest\backend"
npm run build
wrangler deploy
```

### Step 3: Add usage tracking route handlers
After the signup routes, add:

```typescript
    // -------- Usage Tracking --------

    // GET /api/v1/usage
    if (url.pathname === `/api/${v}/usage` && req.method === "GET") {
      try {
        const res = await getUsage(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/usage/increment
    if (url.pathname === `/api/${v}/usage/increment` && req.method === "POST") {
      try {
        const res = await incrementUsage(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }
```

### Step 4: Add admin/owner console route handlers
After the usage routes, add:

```typescript
    // -------- Admin/Owner Console --------

    // GET /api/v1/admin/stats
    if (url.pathname === `/api/${v}/admin/stats` && req.method === "GET") {
      try {
        const res = await getAdminStats(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/tenants
    if (url.pathname === `/api/${v}/admin/tenants` && req.method === "GET") {
      try {
        const res = await listTenants(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/tenants/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`)) && req.method === "GET") {
      try {
        const match = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`));
        const tenantId = match ? match[1] : "";
        const res = await getTenant(req, env, requestId, corsHdrs, tenantId);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // PATCH /api/v1/admin/tenants/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`)) && req.method === "PATCH") {
      try {
        const match = url.pathname.match(new RegExp(`^/api/${v}/admin/tenants/([^/]+)$`));
        const tenantId = match ? match[1] : "";
        const res = await updateTenant(req, env, requestId, corsHdrs, tenantId);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/promo-codes
    if (url.pathname === `/api/${v}/admin/promo-codes` && req.method === "GET") {
      try {
        const res = await listPromoCodes(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/admin/promo-codes
    if (url.pathname === `/api/${v}/admin/promo-codes` && req.method === "POST") {
      try {
        const res = await createPromoCode(req, env, requestId, corsHdrs);
        return respondWithCors(res, corsHdrs);
      } catch (err: any) {
        if (err instanceof Response) return respondWithCors(err, corsHdrs);
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
      }
    }
```

## Testing Commands

Test the signup start endpoint:
```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/public/signup/start \
  -H "Content-Type: application/json" \
  -d '{"clubName":"Test Club","clubSlug":"test-club","email":"test@example.com","plan":"starter","promoCode":"SYSTON100"}'
```

Test usage endpoint (requires JWT):
```bash
curl https://syston-postbus.team-platform-2025.workers.dev/api/v1/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Test admin stats (requires admin JWT):
```bash
curl https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```
