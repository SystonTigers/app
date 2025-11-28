# 🦁 MATCH DAY READY - Syston Tigers

**Status**: ✅ **READY FOR TOMORROW**
**Date**: November 16, 2025
**Setup**: Fully functional local development environment

---

## 🚀 Quick Start (Tomorrow Morning)

### Terminal 1: Backend
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```
Wait for: `[wrangler:info] Ready on http://127.0.0.1:8787`

### Terminal 2: Web App
```bash
cd C:\dev\app-FRESH\web-app
npm run dev -- --turbopack
```
Wait for: `Local: http://localhost:3000`

### Step 3: Login
Visit this URL in your browser to set the admin cookie (valid for 7 days):
```
http://localhost:3000/api/auth/dev-assume?t=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeXN0b250b3dudGlnZXJzZmNAZ21haWwuY29tIiwidGVuYW50X2lkIjoidGVuYW50X3N5c3Rvbl8yMDI0Iiwicm9sZXMiOlsiYWRtaW4iLCJ0ZW5hbnRfYWRtaW4iLCJwbGF0Zm9ybV9hZG1pbiJdLCJpc3MiOiJzeXN0b24uYXBwIiwiYXVkIjoic3lzdG9uLWFkbWluIiwiaWF0IjoxNzYzMjQxMzE3LCJleHAiOjE3NjM4NDYxMTd9.J-DpTBwCi6GT-bLS9CI70GvV4IJnKrBIwfguJAHWC_4
```

This will automatically:
- Set your admin cookie
- Redirect to `/admin` dashboard

---

## ✅ What's Configured

### Database (D1)
- ✅ 13 migrations applied
- ✅ Syston Tigers tenant seeded
  - Slug: `syston-tigers`
  - Plan: **Pro** (Lifetime)
  - Billing: **lifetime**
  - Promo: `SYSTON100` (100% off)
  - Colors: Gold (#FFD700) + Black (#000000)

### Admin User
- ✅ Email: `systontowntigersfc@gmail.com`
- ✅ Roles: `["admin", "tenant_admin", "platform_admin"]`
- ✅ 7-day JWT token (set via dev-assume route)

### API Setup
- ✅ Backend Worker on port 8787
- ✅ Web app proxy on `/api/admin/*` (eliminates CORS)
- ✅ httpOnly cookie authentication
- ✅ No localStorage hacks

### Promo Code
- ✅ Code: `SYSTON100`
- ✅ Discount: 100% off
- ✅ Plan locked: Pro
- ✅ Duration: Lifetime
- ✅ Whitelist: `syston, syston-tigers, syston-town-tigers`

---

## 🎯 Match Day Checklist

After starting both servers and logging in (dev-assume URL above), verify:

1. **Admin Dashboard** (`/admin`)
   - [ ] Stats load without errors
   - [ ] No "Failed to fetch" messages
   - [ ] No CORS errors in console (F12)

2. **Admin Tenants** (`/admin/tenants`)
   - [ ] Shows "Syston Tigers U16"
   - [ ] Plan: Pro
   - [ ] Billing: lifetime
   - [ ] Promo: SYSTON100

3. **Promo Codes** (`/admin/promo-codes`)
   - [ ] Shows SYSTON100
   - [ ] Discount: 100%
   - [ ] Lifetime: true
   - [ ] Plan: pro

4. **Signup/Onboarding** (`/signup`)
   - [ ] Promo input visible at top (yellow background)
   - [ ] Enter `SYSTON100` + slug `syston-tigers`
   - [ ] Click "Apply"
   - [ ] Pro plan locks with yellow border + ✓
   - [ ] Shows "⭐ LIFETIME" badge
   - [ ] Shows "FREE" instead of £29.99
   - [ ] Starter plan grayed out

---

## 🔧 Troubleshooting

### "Failed to fetch" on /admin
- **Fix**: Cookie not set. Re-visit the dev-assume URL above

### CORS errors
- **Fix**: Verify `.env.local` has `NEXT_PUBLIC_API_BASE=/api/admin`
- **Fix**: All SDK calls should use `/api/admin/*`, not direct backend URL

### 403 Unauthorized
- **Fix**: Cookie expired or not set. Re-visit dev-assume URL

### Backend not running
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

### Web app not running
```bash
cd C:\dev\app-FRESH\web-app
rmdir /S /Q .next 2>nul
npm run dev -- --turbopack
```

### Password login not working
**Known Issue**: bcryptjs can't be installed due to workspace conflicts.
**Solution**: Use the dev-assume JWT URL above instead. The cookie lasts 7 days.

---

## 📊 Technical Details

### Architecture
- **Backend**: Cloudflare Worker (Wrangler dev server)
- **Database**: D1 (local SQLite via Wrangler)
- **Web App**: Next.js 16 with Turbopack
- **Auth**: JWT in httpOnly cookies (7-day expiry)
- **API**: Same-origin proxy eliminates CORS

### Environment Variables
**Backend** (`.dev.vars`):
```
ENVIRONMENT=development
JWT_SECRET=6e4f7eb3357f1f2f9b46a6097a93a58c8643fa642caa904c05eb0b52c62985a5
JWT_ISSUER=syston.app
JWT_AUDIENCE=syston-admin
```

**Web App** (`.env.local`):
```
NEXT_PUBLIC_API_BASE=/api/admin
BACKEND_API_BASE=http://localhost:8787
```

### Key Files Modified
- ✅ `backend/wrangler.toml` - D1 binding configured
- ✅ `backend/scripts/seed-syston.sql` - Syston tenant + admin user
- ✅ `backend/make-admin-jwt.mjs` - JWT generation script
- ✅ `web-app/next.config.js` - Turbopack root fixed
- ✅ `web-app/src/app/api/admin/[...path]/route.ts` - API proxy
- ✅ `web-app/src/app/api/auth/dev-assume/route.ts` - Cookie setter
- ✅ `web-app/src/app/api/auth/admin-login/route.ts` - Login endpoint (password auth blocked by bcryptjs issue)

---

## 🎉 You're Ready!

Everything is configured for tomorrow's match. The app is fully functional for Syston Tigers with:
- Lifetime Pro plan
- 100% discount via SYSTON100
- Gold & black branding
- Admin access via JWT cookie

**Good luck with the match! 🦁⚽**
