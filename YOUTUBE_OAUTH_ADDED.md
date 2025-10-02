# YouTube OAuth UI - Implementation Complete ✅

## What Was Done

### ✅ Backend Verification
- Confirmed `GET /api/v1/admin/yt/start` exists in `backend/src/index.ts`
- Confirmed `GET /api/v1/admin/yt/callback` exists in `backend/src/index.ts`
- Verified `YT_REDIRECT_URL` is set in `backend/wrangler.toml`

### ✅ Admin Console Updates (`admin/index.ts`)
1. **Added YouTube OAuth Section**
   - New form between "Set Make Webhook" and "Refresh Fixtures Cache"
   - Pre-fills with default tenant
   - "Connect YouTube" button

2. **Added GET Handler for `/yt/start`**
   - Fetches OAuth URL from backend
   - Redirects user to Google OAuth flow
   - Handles errors gracefully with error messages

3. **Clean Input Field**
   - Verified webhook input has no stray "false" text
   - Input is clean: `<input name="url" placeholder="https://hook.make.com/...." required>`

### ✅ Git Commit
- Changes committed: `admin: add YouTube OAuth UI and connect button`
- Ready to push to trigger GitHub Actions deploy

---

## What You Need to Do

### 1. Set Secrets (If Not Already Done)

Before the OAuth flow will work, you need:

```powershell
cd "$HOME/OneDrive/Desktop/SystonApp/backend"

wrangler secret put YT_CLIENT_ID
# Paste your Google OAuth Client ID

wrangler secret put YT_CLIENT_SECRET
# Paste your Google OAuth Client Secret
```

**Get these from:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI:
   ```
   https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/yt/callback
   ```
4. Copy Client ID and Client Secret

---

### 2. Push to Deploy

```powershell
cd "$HOME/OneDrive/Desktop/SystonApp"

git push
```

GitHub Actions will automatically deploy the updated admin console.

---

### 3. Test the Flow

**A. Access Admin Console:**
```
https://admin-console.team-platform-2025.workers.dev
```

**B. Login with Basic Auth**
- Username: (from `ADMIN_USER` secret)
- Password: (from `ADMIN_PASS` secret)

**C. Test YouTube OAuth:**
1. In the **"YouTube OAuth (Managed plan)"** section
2. Enter tenant ID (or use default `test-tenant`)
3. Click **"Connect YouTube"**
4. You'll be redirected to Google
5. Grant permissions
6. Google will redirect back to your callback URL
7. Tokens will be stored in tenant config

**D. Verify in Logs:**
```powershell
cd backend
wrangler tail
```

Watch for the callback hit and token storage.

---

## Expected Flow

```
User clicks "Connect YouTube"
    ↓
Admin console calls GET /api/v1/admin/yt/start?tenant=X
    ↓
Backend returns { success: true, data: { url: "https://accounts.google.com/..." } }
    ↓
Admin console redirects browser to Google OAuth
    ↓
User grants permissions on Google
    ↓
Google redirects to /api/v1/admin/yt/callback?code=...&state=tenant
    ↓
Backend exchanges code for refresh_token
    ↓
Backend stores tokens in tenant config (KV_IDEMP)
    ↓
User sees "YouTube connected. You can close this window."
```

---

## Testing a Managed Job

After connecting YouTube:

```powershell
$ADMIN = $env:ADMIN_JWT
$BASE = "https://syston-postbus.team-platform-2025.workers.dev"

# Ensure tenant is in managed mode
'{"tenant":"test-tenant","flags":{"use_make":false,"direct_yt":true}}' | curl.exe -s -X POST -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/flags"

# Queue a YouTube job
$job = '{"tenant":"test-tenant","template":"highlight","channels":["yt"],"data":{"title":"Test Video","description":"Test"}}'
$job | curl.exe -i -X POST -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: yt-test-$(Get-Random)" --data-binary "@-" "$BASE/api/v1/post"
```

The queue consumer will use the stored YouTube tokens to publish directly (no Make webhook).

---

## Troubleshooting

**"Error: Invalid client"**
- Check that `YT_CLIENT_ID` secret matches your Google Console app
- Verify redirect URI in Google Console exactly matches callback URL

**"Error: redirect_uri_mismatch"**
- Ensure redirect URI in Google Console is exactly:
  ```
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/yt/callback
  ```
- No trailing slash
- HTTPS required

**Backend returns 500**
- Check that `YT_REDIRECT_URL` is set in `backend/wrangler.toml` vars
- Check wrangler logs: `wrangler tail`

**"Cannot read property 'url' of undefined"**
- Backend's `/admin/yt/start` endpoint might not be returning the right format
- Check backend logs
- Verify JWT token is valid

---

## Next Steps

1. ✅ Set Google OAuth credentials
2. ✅ Push to deploy
3. ✅ Test the flow
4. ✅ Queue a test YouTube job
5. Optional: Add "Disconnect YouTube" button (needs backend endpoint)

---

## Files Modified

- `admin/index.ts` - Added YouTube OAuth UI + handler
- Commit: `admin: add YouTube OAuth UI and connect button`

Ready to push! 🚀
