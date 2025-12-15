# 🏆 MATCH READY - Syston Tomorrow

**Status**: ✅ **READY TO RUN** - All implementation complete

---

## 📋 Quick Start (Run These Commands)

### Step 1: Install Dependencies (if not done)
```bash
cd C:\dev\app-FRESH
npm install
```

### Step 2: Run Database Migrations
```bash
cd C:\dev\app-FRESH\backend

# Apply migration 012 (adds lifetime + billing_tier fields)
npx wrangler d1 migrations apply syston-db --local

# Seed Syston tenant (local database)
npm run seed:syston
```

**Expected output**:
```
🌱 Seeding Syston tenant...
✅ Rows inserted: 6
```

### Step 3: Verify Syston Tenant Exists
```bash
cd C:\dev\app-FRESH\backend
npx wrangler d1 execute syston-db --local --command "SELECT slug, name, billing_tier, plan, promo_code_used FROM tenants WHERE slug='syston-tigers';"
```

**Expected output**:
```
┌───────────────┬────────────────────┬──────────────┬──────┬──────────────────┐
│ slug          │ name               │ billing_tier │ plan │ promo_code_used  │
├───────────────┼────────────────────┼──────────────┼──────┼──────────────────┤
│ syston-tigers │ Syston Tigers U16  │ lifetime     │ pro  │ SYSTON100        │
└───────────────┴────────────────────┴──────────────┴──────┴──────────────────┘
```

### Step 4: Start Development Servers

**Terminal 1 - Backend**:
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

Keep this running. You should see:
```
⛅️ wrangler 3.x.x
-------------------
Your worker has access to the following bindings:
- D1 Databases:
  - DB: syston-db (...)
```

**Terminal 2 - Web App** (open a NEW terminal):
```bash
cd C:\dev\app-FRESH\web-app
npm run dev -- --turbopack
```

You should see:
```
▲ Next.js 16.x.x (turbopack)
- Local:        http://localhost:3000
```

---

## ✅ Testing Flow (Match-Day Checklist)

### 1. Admin Login
- **URL**: http://localhost:3000/admin/login
- **Email**: `systontowntigersfc@gmail.com`
- **Password**: `SystonAdmin2024!`
- **Expected**: Redirects to `/admin` without errors

### 2. Admin Dashboard
- **URL**: http://localhost:3000/admin
- **Expected**:
  - Stats load (no 403 errors)
  - No CORS warnings in console
  - All API calls to `/api/admin/*` (check Network tab)

### 3. Admin Tenants Page
- **URL**: http://localhost:3000/admin/tenants
- **Expected**: Lists "Syston Tigers U16" with:
  - Plan: Pro
  - Billing Tier: lifetime
  - Promo: SYSTON100
  - Status: active

### 4. Admin Promo Codes
- **URL**: http://localhost:3000/admin/promo-codes
- **Expected**: Shows SYSTON100 with:
  - Discount: 100%
  - Plan: pro
  - Lifetime: true
  - Whitelist: syston,syston-tigers,syston-town-tigers

### 5. Onboarding/Signup Page
- **URL**: http://localhost:3000/signup
- **Steps**:
  1. Enter promo code: `SYSTON100`
  2. Enter slug: `syston-tigers`
  3. Click "Apply"
  4. **Expected**:
     - ✅ Shows success message: "Applied SYSTON100 • 100% off • Lifetime Pro"
     - ✅ Pro plan card turns yellow with checkmark
     - ✅ Shows "⭐ LIFETIME" badge in black/yellow
     - ✅ Shows "FREE" instead of £29.99
     - ✅ Starter plan is grayed out/disabled

### 6. Check Console
- **Browser DevTools → Console**: No errors
- **Browser DevTools → Network**: All requests to `localhost:3000/api/admin/*`
- **No CORS errors**
- **No 403 errors after login**

---

## 🎯 What Was Implemented

### ✅ PHASE 0: Repo Setup
- Workspaces configured in root package.json
- SDK properly linked

### ✅ PHASE 1: Backend + Database
- Migration 012 created: `backend/migrations/012_add_lifetime_and_billing_tier.sql`
- Seed script created: `backend/scripts/seed-syston.sql`
- bcryptjs added to dependencies
- npm scripts added:
  - `npm run seed:syston` (local)
  - `npm run seed:syston:remote` (production)

### ✅ PHASE 2: Admin Auth (Cookie-Based)
- Created: `web-app/src/app/api/auth/admin-login/route.ts`
- Exchanges email/password for JWT
- Sets httpOnly cookie `admin_jwt` (7-day expiry)
- Updated: `web-app/src/app/admin/login/page.tsx` to use email/password form

### ✅ PHASE 3: Server Proxy (No CORS)
- Created: `web-app/src/app/api/admin/[...path]/route.ts`
- All API calls proxied through Next.js
- Cookie automatically forwarded as Bearer token
- Created env files:
  - `web-app/.env.local` → `http://localhost:8787`
  - `web-app/.env.production` → production backend URL

### ✅ PHASE 4: SDK Cleanup
- Updated: `web-app/src/lib/sdk.ts`
- Removed localStorage token logic
- All calls use `credentials: 'include'`
- Simplified to use proxy

### ✅ PHASE 5: Onboarding Polish + Promo
- Updated: `web-app/src/app/signup/page.tsx`
- Promo code input at top with yellow styling
- Apply/Remove buttons
- Calls `/api/admin/public/signup/verify-promo`
- When SYSTON100 applied:
  - Locks to Pro plan (disables Starter)
  - Shows "⭐ LIFETIME" badge (black bg, yellow text)
  - Shows "FREE" instead of price
  - Yellow border + checkmark on selected plan

### ✅ PHASE 6: Admin Pages
- Backend endpoint: `POST /api/v1/admin/login` created
- Verifies password with bcrypt
- Checks for `tenant_admin` or `platform_admin` role
- Returns JWT with 7-day expiry
- Protected tenant slugs (syston variants) cannot be deleted

### ✅ PHASE 7 & 8: Dev Setup
- Instructions provided above for running servers
- Match-day checklist included

---

## 🗂️ Files Created/Modified

### Created (8 new files):
1. `backend/migrations/012_add_lifetime_and_billing_tier.sql`
2. `backend/scripts/seed-syston.sql`
3. `backend/scripts/seed-syston.ts` (alternative TypeScript version)
4. `web-app/.env.local`
5. `web-app/.env.production`
6. `web-app/src/app/api/admin/[...path]/route.ts`
7. `web-app/src/app/api/auth/admin-login/route.ts`
8. `SYSTON_TONIGHT_IMPLEMENTATION.md` (detailed docs)

### Modified (7 files):
1. `package.json` (root) - added workspaces
2. `backend/package.json` - added bcryptjs, seed scripts
3. `web-app/package.json` - renamed, added SDK dep
4. `web-app/src/app/admin/login/page.tsx` - email/password form
5. `web-app/src/lib/sdk.ts` - removed localStorage
6. `web-app/src/app/signup/page.tsx` - promo UI + logic
7. `backend/src/index.ts` - admin login endpoint

---

## 🔐 Default Credentials

**Admin Login:**
- Email: `systontowntigersfc@gmail.com`
- Password: `SystonAdmin2024!`

**⚠️ IMPORTANT**: Change this password after first login!

To generate a new password hash:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_NEW_PASSWORD', 10));"
```

Then update the hash in `backend/scripts/seed-syston.sql` and re-run `npm run seed:syston`.

---

## 🚀 Production Deployment (When Ready)

### 1. Run Migrations on Production
```bash
cd C:\dev\app-FRESH\backend
npx wrangler d1 migrations apply syston-db --remote
npm run seed:syston:remote
```

### 2. Deploy Backend
```bash
cd C:\dev\app-FRESH\backend
npx wrangler deploy
```

### 3. Deploy Web App
```bash
cd C:\dev\app-FRESH\web-app
npm run build
# Deploy the .next/ build to your hosting (Cloudflare Pages/Vercel/Netlify)
```

---

## 🐛 Troubleshooting

### "Failed to fetch" errors
- ✅ Make sure you're logged in at `/admin/login`
- ✅ Check that backend is running on port 8787
- ✅ Verify cookie `admin_jwt` is set (DevTools → Application → Cookies)

### CORS errors
- ❌ You're calling the backend directly (wrong!)
- ✅ All calls should go through `/api/admin/*` proxy
- ✅ Check `NEXT_PUBLIC_API_BASE` is set to `/api/admin`

### 403 Unauthorized
- ✅ Login again at `/admin/login`
- ✅ Check backend `/api/v1/admin/login` returns `{ jwt: "..." }`
- ✅ Verify user has `tenant_admin` role in database

### Module not found: @team-platform/sdk
- ✅ Run `npm install` at repo root (not in web-app)
- ✅ Check workspaces are configured in root package.json

### Password doesn't work
- ✅ Hash in database might be wrong
- ✅ Generate new hash: `node -e "console.log(require('bcryptjs').hashSync('PASSWORD', 10))"`
- ✅ Update `backend/scripts/seed-syston.sql` and re-run seed

---

## 🎉 Success Criteria

- [  ] ✅ Backend running on localhost:8787
- [  ] ✅ Web app running on localhost:3000
- [  ] ✅ Login works at /admin/login
- [  ] ✅ /admin shows stats (no 403)
- [  ] ✅ /admin/tenants shows Syston Tigers U16
- [  ] ✅ /admin/promo-codes shows SYSTON100
- [  ] ✅ /signup promo field accepts SYSTON100
- [  ] ✅ SYSTON100 + syston-tigers → locks to Pro + Lifetime
- [  ] ✅ No CORS errors in console
- [  ] ✅ No "Failed to fetch" errors
- [  ] ✅ All API calls through `/api/admin/*`
- [  ] ✅ `npm run build` succeeds

---

## 📝 Notes

1. **Syston tenant is pre-configured** with:
   - Slug: `syston-tigers`
   - Plan: Pro
   - Billing: Lifetime
   - Promo: SYSTON100
   - Colors: Gold (#FFD700) + Black (#000000)

2. **SYSTON100 promo code** is configured to:
   - Give 100% discount
   - Lock to Pro plan
   - Be lifetime (no recurring billing)
   - Work only for whitelisted slugs: syston, syston-tigers, syston-town-tigers

3. **Protected slugs**: The admin cannot delete tenants with slugs containing "syston"

4. **Password authentication** is now primary (magic link is secondary)

5. **Cookie-based auth** means no localStorage hacks, no CORS issues

---

## 🚢 Ready for Match Day!

Everything is implemented and ready. Just run the commands above and test the flow.

**Good luck with Syston tomorrow! 🦁⚽**
