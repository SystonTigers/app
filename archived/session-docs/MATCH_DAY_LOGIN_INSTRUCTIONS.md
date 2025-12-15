# 🦁 MATCH DAY LOGIN - Syston Tigers
**Status**: ✅ **SERVERS RUNNING** | **DATABASE SEEDED** | **READY TO LOGIN**

---

## ✅ Current Status (Verified)

### Servers Running
- ✅ Backend: http://localhost:8787 (responding)
- ✅ Web App: http://localhost:3000 (responding)

### Database Verified
- ✅ Tenant: `syston-tigers` | Plan: Pro | Billing: Lifetime | Promo: SYSTON100
- ✅ Admin User: `systontowntigersfc@gmail.com`
- ✅ Password: Set ✅
- ✅ Roles: `["admin","tenant_admin","platform_admin"]`

---

## 🔐 LOGIN METHOD 1: Token (Instant - No Password)

**Fastest way to get in right now:**

1. Open http://localhost:3000
2. Open browser console (F12)
3. Paste and run:

```javascript
await fetch('/api/auth/admin-login', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeXN0b250b3dudGlnZXJzZmNAZ21haWwuY29tIiwidGVuYW50X2lkIjoidGVuYW50X3N5c3Rvbl8yMDI0Iiwicm9sZXMiOlsiYWRtaW4iLCJ0ZW5hbnRfYWRtaW4iLCJwbGF0Zm9ybV9hZG1pbiJdLCJpc3MiOiJzeXN0b24uYXBwIiwiYXVkIjoic3lzdG9uLWFkbWluIiwiaWF0IjoxNzYzMjQxMzE3LCJleHAiOjE3NjM4NDYxMTd9.J-DpTBwCi6GT-bLS9CI70GvV4IJnKrBIwfguJAHWC_4'
  })
});
location.href='/admin';
```

4. **Result**: Cookie set (7 days) → redirected to `/admin`

---

## 🔐 LOGIN METHOD 2: Password (Standard)

**If password login is working:**

1. Go to http://localhost:3000/admin/login
2. Email: `systontowntigersfc@gmail.com`
3. Password: `SystonAdmin2024!` (or the password you set)
4. Click Login

**If this gives you errors**, the bcryptjs issue might be blocking password verification. Use Method 1 instead.

---

## 🔐 LOGIN METHOD 3: Dev-Assume URL (One-Click)

**Bookmark this URL for instant login:**

```
http://localhost:3000/api/auth/dev-assume?t=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeXN0b250b3dudGlnZXJzZmNAZ21haWwuY29tIiwidGVuYW50X2lkIjoidGVuYW50X3N5c3Rvbl8yMDI0Iiwicm9sZXMiOlsiYWRtaW4iLCJ0ZW5hbnRfYWRtaW4iLCJwbGF0Zm9ybV9hZG1pbiJdLCJpc3MiOiJzeXN0b24uYXBwIiwiYXVkIjoic3lzdG9uLWFkbWluIiwiaWF0IjoxNzYzMjQxMzE3LCJleHAiOjE3NjM4NDYxMTd9.J-DpTBwCi6GT-bLS9CI70GvV4IJnKrBIwfguJAHWC_4
```

Click this URL → Cookie set → Redirected to /admin

---

## ✅ Post-Login Verification Checklist

Once logged in, verify these pages:

### 1. `/admin` - Dashboard
- [ ] Stats load (1 active tenant, 1 pro plan)
- [ ] No "Failed to fetch" errors
- [ ] No CORS errors in console (F12)

**Expected Data:**
```json
{
  "byStatus": [{"status":"active","count":1}],
  "byPlan": [{"plan":"pro","count":1}]
}
```

### 2. `/admin/tenants` - Tenant List
- [ ] Shows "Syston Tigers U16"
- [ ] Plan: Pro
- [ ] Billing Tier: lifetime
- [ ] Promo Used: SYSTON100
- [ ] Protected from deletion

### 3. `/admin/promo-codes` - Promo Management
- [ ] SYSTON100 visible
- [ ] Discount: 100%
- [ ] Lifetime: true
- [ ] Plan: pro
- [ ] Whitelist: syston-tigers,syston,stt

### 4. `/signup` - Onboarding Flow
- [ ] Promo code input visible (yellow background)
- [ ] Enter code: `SYSTON100`
- [ ] Enter slug: `syston-tigers`
- [ ] Click "Apply"
- [ ] Pro plan locks with yellow border + ✓
- [ ] Shows "⭐ LIFETIME" badge
- [ ] Shows "FREE" instead of price
- [ ] Starter plan grayed out

---

## 🔧 If Login Fails

### Issue: "Failed to fetch" after login

**Check cookie:**
1. F12 → Application → Cookies → http://localhost:3000
2. Look for `admin_jwt` cookie
3. If missing → Re-run Method 1 (token login)

**Check environment:**
```bash
# Verify .env.local
cat C:\dev\app-FRESH\web-app\.env.local
```

Should contain:
```
NEXT_PUBLIC_API_BASE=/api/admin
BACKEND_API_BASE=http://localhost:8787
```

### Issue: 403 Forbidden

**Test proxy in browser console:**
```javascript
fetch('/api/admin/api/v1/healthz').then(r => r.status).then(console.log)
// Should return 200 (or your health endpoint response)
```

If 403:
- Cookie not set → Use Method 1 to set it
- Backend not running → Check Terminal A

### Issue: Password login returns 401/500

**Known Issue**: bcryptjs can't be installed due to workspace conflicts.

**Solution**: Use Method 1 (token) or Method 3 (dev-assume URL) instead.

---

## 🔄 Restart Servers (if needed)

### Stop all servers:
```bash
# Kill any existing processes
netstat -ano | findstr ":3000 .*LISTENING"
netstat -ano | findstr ":8787 .*LISTENING"
# Note the PID and kill:
taskkill /F /PID <pid>
```

### Restart Backend (Terminal A):
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

### Restart Web App (Terminal B):
```bash
cd C:\dev\app-FRESH\web-app
rmdir /S /Q .next 2>nul
npm run dev -- --turbopack
```

---

## 🎯 Match Day Final Checklist

Before the match, verify:

- [ ] Both servers running (backend :8787, web :3000)
- [ ] Logged in successfully (any method above)
- [ ] `/admin` dashboard loads
- [ ] `/admin/tenants` shows Syston Tigers U16
- [ ] Console has no CORS errors
- [ ] Cookie `admin_jwt` present in browser

---

## 🎉 You're Match Ready!

**Fastest Path:**
1. Servers already running ✅
2. Use Method 1 (token in console) - 10 seconds
3. Verify `/admin` loads
4. Done!

**Good luck with the match! 🦁⚽**
