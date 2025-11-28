# 🚀 START HERE - Run Syston Tomorrow

## ✅ Setup Complete!

- ✅ Database migrated (13 migrations applied)
- ✅ Syston tenant seeded (Pro · Lifetime · SYSTON100)
- ✅ Admin user created with password auth
- ✅ Cookie auth fixed for localhost

---

## 🎯 **3 Commands to Start**

### Terminal 1: Start Backend
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

Keep this running. Wait for:
```
⛅️ wrangler 4.x.x
Your worker has access to the following bindings:
- D1 Databases:
  - DB: syston-db-local
```

### Terminal 2: Start Web App (NEW Terminal)
```bash
cd C:\dev\app-FRESH\web-app
npm run dev -- --turbopack
```

Wait for:
```
▲ Next.js 16.x.x (turbopack)
- Local:        http://localhost:3000
```

### Terminal 3: Run Quick Checks (NEW Terminal)
```bash
# 1. Backend up
curl -s http://localhost:8787/__meta/ping

# 2. Proxy working
curl -s -o NUL -w "%{http_code}\n" http://localhost:3000/api/admin/__meta/ping

# 3. Admin login route
curl -s -o NUL -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/admin-login -H "content-type: application/json" -d "{\"email\":\"systontowntigersfc@gmail.com\",\"password\":\"SystonAdmin2024!\"}"
```

Expected: `{"ok":true}`, `200`, `200`

---

## 🔐 **Login & Test**

### 1. Login
**URL**: http://localhost:3000/admin/login

**Credentials**:
- Email: `systontowntigersfc@gmail.com`
- Password: `SystonAdmin2024!`

**Expected**: Redirects to `/admin` without errors

### 2. Admin Dashboard
**URL**: http://localhost:3000/admin

**Check**:
- Stats load (no 403)
- No CORS errors in console (F12 → Console)
- All network requests to `localhost:3000/api/admin/*` (F12 → Network)

### 3. Admin Tenants
**URL**: http://localhost:3000/admin/tenants

**Expected**: Shows "Syston Tigers U16"
- Plan: Pro
- Billing: lifetime
- Promo: SYSTON100

### 4. Promo Codes
**URL**: http://localhost:3000/admin/promo-codes

**Expected**: Shows SYSTON100 with:
- Discount: 100%
- Lifetime: true
- Plan: pro

### 5. Onboarding/Signup
**URL**: http://localhost:3000/signup

**Test**:
1. Enter promo: `SYSTON100`
2. Enter slug: `syston-tigers`
3. Click "Apply"

**Expected**:
- ✅ Success message shows
- ✅ Pro plan locked with yellow border + ✓
- ✅ "⭐ LIFETIME" badge visible
- ✅ Shows "FREE" instead of £29.99
- ✅ Starter plan grayed out

---

## 🐛 Troubleshooting

### "Failed to fetch" on /admin
**Fix**: Make sure you logged in first at `/admin/login`

### CORS errors
**Fix**: Check that `NEXT_PUBLIC_API_BASE=/api/admin` in `.env.local`

### 403 Unauthorized
**Fix**: Clear cookies and login again

### Backend not running
**Fix**:
```bash
cd C:\dev\app-FRESH\backend
npx wrangler dev --local --port 8787
```

### Web app not running
**Fix**:
```bash
cd C:\dev\app-FRESH\web-app
rmdir /s /q .next 2>nul
npm run dev -- --turbopack
```

---

## ✅ **Success Checklist**

- [ ] Backend running on `:8787`
- [ ] Web app running on `:3000`
- [ ] Login works → `/admin` loads
- [ ] `/admin/tenants` shows Syston
- [ ] `/admin/promo-codes` shows SYSTON100
- [ ] `/signup` promo works
- [ ] No CORS errors
- [ ] No 403 errors
- [ ] All API calls through `/api/admin/*`

---

## 🎉 Match Day Ready!

Everything is configured for Syston tomorrow:
- **Tenant**: syston-tigers (Pro · Lifetime)
- **Admin**: systontowntigersfc@gmail.com
- **Promo**: SYSTON100 (100% off · Lifetime Pro)
- **Colors**: Gold (#FFD700) + Black (#000000)

**Good luck! 🦁⚽**
