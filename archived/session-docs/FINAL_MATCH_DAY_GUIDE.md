# 🦁 FINAL MATCH DAY GUIDE - Syston Tigers
**Status**: ✅ **100% READY** | **Tested & Working**
**Date**: November 16, 2025

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Backend
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```
**Wait for**: `[wrangler:info] Ready on http://127.0.0.1:8787`

### Step 2: Start Web App
```bash
cd C:\dev\app-FRESH\web-app
npm run dev -- --turbopack
```
**Wait for**: `Local: http://localhost:3000`

### Step 3: Login (Browser Console)
Open http://localhost:3000 and run in console (F12):

```javascript
await fetch('/api/auth/admin-login', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeXN0b250b3dudGlnZXJzZmNAZ21haWwuY29tIiwidGVuYW50X2lkIjoidGVuYW50X3N5c3Rvbl8yMDI0Iiwicm9sZXMiOlsiYWRtaW4iLCJ0ZW5hbnRfYWRtaW4iLCJwbGF0Zm9ybV9hZG1pbiJdLCJpc3MiOiJzeXN0b24uYXBwIiwiYXVkIjoic3lzdG9uLWFkbWluIiwiaWF0IjoxNzYzMjQxMzE3LCJleHAiOjE3NjM4NDYxMTd9.J-DpTBwCi6GT-bLS9CI70GvV4IJnKrBIwfguJAHWC_4'
  })
});
location.href = '/admin';
```

**Result**: Cookie set (7 days) → redirects to `/admin` dashboard

---

## ✅ Verified Working Features

### Database
- ✅ 13 migrations applied
- ✅ Syston Tigers tenant: `syston-tigers`
- ✅ Plan: Pro (Lifetime)
- ✅ Promo: SYSTON100 (100% off, lifetime)
- ✅ Admin user with `["admin","tenant_admin","platform_admin"]` roles
- ✅ Branding: Gold (#FFD700) + Black (#000000)

### API & Auth
- ✅ Backend Worker: port 8787
- ✅ Web App Proxy: `/api/admin/*` (no CORS)
- ✅ httpOnly cookie auth (secure=false for localhost)
- ✅ Token-based login working
- ✅ Cookie forwarded as Bearer token
- ✅ Admin endpoints returning data

### Tested Endpoints
- ✅ `/__meta/ping` → `{"ok":true}`
- ✅ `/api/admin/api/v1/admin/stats` → Stats with 1 active Pro tenant
- ✅ Token login → `{"ok":true,"mode":"token"}`

---

## 📋 Match Day Checklist

After starting servers and logging in (Step 3 above):

### 1. Admin Dashboard (`/admin`)
- [ ] Stats load (1 active, 1 pro)
- [ ] No "Failed to fetch" errors
- [ ] No CORS errors in console

### 2. Admin Tenants (`/admin/tenants`)
- [ ] Shows "Syston Tigers U16"
- [ ] Plan: Pro
- [ ] Billing: lifetime
- [ ] Promo: SYSTON100

### 3. Promo Codes (`/admin/promo-codes`)
- [ ] SYSTON100 visible
- [ ] Discount: 100%
- [ ] Lifetime: true
- [ ] Whitelist: syston-tigers,syston,stt

### 4. Signup Flow (`/signup`)
- [ ] Promo input visible (yellow background)
- [ ] Enter `SYSTON100` + `syston-tigers`
- [ ] Click "Apply"
- [ ] Pro plan locks (yellow border + ✓)
- [ ] Shows "⭐ LIFETIME" badge
- [ ] Shows "FREE" instead of price

---

## 🔧 Troubleshooting

### "Failed to fetch" or 403 errors
**Cause**: Cookie not set
**Fix**: Re-run Step 3 browser console command

### CORS errors
**Cause**: Wrong API base
**Fix**: Verify `.env.local` has `NEXT_PUBLIC_API_BASE=/api/admin`

### Backend not responding
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

### Web app not loading
```bash
cd C:\dev\app-FRESH\web-app
rmdir /S /Q .next
npm run dev -- --turbopack
```

### Need fresh JWT token
```bash
cd C:\dev\app-FRESH\backend
node make-admin-jwt.mjs
```
Copy the token from output, use in Step 3.

---

## 🎯 What Was Fixed

1. ✅ **Cookie secure flag**: Changed from `true` to `process.env.NODE_ENV === 'production'` so cookies work on localhost
2. ✅ **Token-based login**: Added direct token support to `/api/auth/admin-login` for easy access
3. ✅ **Seed script**: Updated with BEGIN/COMMIT transaction and INSERT OR REPLACE
4. ✅ **Admin user roles**: Added "admin" role (was missing, causing 403s)
5. ✅ **Proxy route**: Already perfect with Next 16 async params
6. ✅ **Turbopack config**: Added `root: __dirname` to fix workspace issues

---

## 🎉 Ready to Go!

**Both servers running** ✅
**Database seeded** ✅
**Auth working** ✅
**Proxy working** ✅
**Admin endpoints tested** ✅

### Token Login URL (Alternative Method)
If you prefer a URL instead of console:
```
http://localhost:3000/api/auth/dev-assume?t=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeXN0b250b3dudGlnZXJzZmNAZ21haWwuY29tIiwidGVuYW50X2lkIjoidGVuYW50X3N5c3Rvbl8yMDI0Iiwicm9sZXMiOlsiYWRtaW4iLCJ0ZW5hbnRfYWRtaW4iLCJwbGF0Zm9ybV9hZG1pbiJdLCJpc3MiOiJzeXN0b24uYXBwIiwiYXVkIjoic3lzdG9uLWFkbWluIiwiaWF0IjoxNzYzMjQxMzE3LCJleHAiOjE3NjM4NDYxMTd9.J-DpTBwCi6GT-bLS9CI70GvV4IJnKrBIwfguJAHWC_4
```

**Good luck with tomorrow's match! 🦁⚽**
