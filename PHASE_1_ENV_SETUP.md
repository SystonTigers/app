# 🔐 PHASE 1 - ENVIRONMENT VARIABLES SETUP

## Quick Setup Guide

After implementing Phase 1 backend fixes, you need to set these environment variables for the system to work.

---

## 1. GET YOUR GEMINI API KEY (FREE!)

1. Visit: **https://aistudio.google.com/apikey**
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

---

## 2. GENERATE COACHING API KEY

This is for authenticating the Python service.

**On Mac/Linux:**
```bash
openssl rand -hex 32
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Or use any random string:**
```
coaching-api-key-$(date +%s)-$RANDOM
```

Copy this key - you'll use it in both backend and Python service.

---

## 3. SET CLOUDFLARE WORKERS ENVIRONMENT VARIABLES

### Option A: Via Cloudflare Dashboard

1. Go to **Workers & Pages** → Your Worker → **Settings** → **Variables**
2. Add these variables:

| Variable Name | Value | Type |
|---------------|-------|------|
| `PYTHON_COACHING_SERVICE_URL` | `http://localhost:8000` (or your server URL) | Plain text |
| `GEMINI_API_KEY` | Your Gemini API key | Secret |
| `COACHING_SERVICE_API_KEY` | Your generated coaching API key | Secret |

### Option B: Via Wrangler CLI

```bash
cd C:\dev\app-FRESH\backend

# Set secrets (encrypted)
wrangler secret put GEMINI_API_KEY
# Paste your Gemini API key when prompted

wrangler secret put COACHING_SERVICE_API_KEY
# Paste your coaching API key when prompted

# Set plain text vars in wrangler.toml
# Add to [env.production.vars]:
# PYTHON_COACHING_SERVICE_URL = "http://localhost:8000"
```

### Option C: Update wrangler.toml

Edit `/backend/wrangler.toml`:

```toml
[env.production.vars]
PYTHON_COACHING_SERVICE_URL = "http://localhost:8000"

# Or for production server:
# PYTHON_COACHING_SERVICE_URL = "https://coaching.yourdomain.com"
# PYTHON_COACHING_SERVICE_URL = "http://your-vps-ip:8000"
```

Then set secrets:
```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put COACHING_SERVICE_API_KEY
```

---

## 4. SET PYTHON SERVICE ENVIRONMENT VARIABLES

### Option A: Environment Variables (Recommended)

**Windows:**
```bash
setx GEMINI_API_KEY "your-gemini-api-key"
setx COACHING_API_KEY "your-coaching-api-key"

# Restart terminal for changes to take effect
```

**Mac/Linux:**
```bash
export GEMINI_API_KEY="your-gemini-api-key"
export COACHING_API_KEY="your-coaching-api-key"

# Add to ~/.bashrc or ~/.zshrc for persistence:
echo 'export GEMINI_API_KEY="your-gemini-api-key"' >> ~/.bashrc
echo 'export COACHING_API_KEY="your-coaching-api-key"' >> ~/.bashrc
```

### Option B: .env File

Create `/video-processing/highlights_bot/.env`:

```bash
# Gemini AI API Key (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key-here

# Coaching Service API Key (same as COACHING_SERVICE_API_KEY in Cloudflare)
COACHING_API_KEY=your-coaching-api-key-here

# Optional: Cloudflare KV integration
CLOUDFLARE_KV_API_URL=https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT/storage/kv/namespaces/YOUR_NAMESPACE
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

Then install python-dotenv:
```bash
pip install python-dotenv
```

And add to top of `coaching_service.py`:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

## 5. VERIFY SETUP

### Test Cloudflare Workers

```bash
cd C:\dev\app-FRESH\backend

# Check wrangler.toml has URL
grep PYTHON_COACHING_SERVICE_URL wrangler.toml

# List secrets (won't show values, just names)
wrangler secret list
# Should show: GEMINI_API_KEY, COACHING_SERVICE_API_KEY
```

### Test Python Service

```bash
cd C:\dev\app-FRESH\video-processing\highlights_bot

# Check env vars are set
echo $GEMINI_API_KEY      # Mac/Linux
echo %GEMINI_API_KEY%     # Windows CMD
$env:GEMINI_API_KEY       # Windows PowerShell

# Test service starts
python coaching_service.py

# Should see:
# ✅ AI components initialized successfully
# 🚀 Starting AI Coaching Service...
```

Visit: **http://localhost:8000/health**

Should return:
```json
{
  "status": "healthy",
  "components": {
    "mistake_detector": true,
    "drill_generator": true,
    "gemini_api_key": true,
    "cloudflare_kv": false
  }
}
```

---

## 6. PRODUCTION DEPLOYMENT VALUES

When deploying to production, update these:

### Development (Local Testing)
```bash
PYTHON_COACHING_SERVICE_URL=http://localhost:8000
```

### Production (VPS/Cloud)
```bash
# If using VPS
PYTHON_COACHING_SERVICE_URL=http://your-vps-ip:8000

# If using domain
PYTHON_COACHING_SERVICE_URL=https://coaching.yourdomain.com

# If using Cloudflare Tunnel
PYTHON_COACHING_SERVICE_URL=https://coaching-tunnel.yourdomain.com
```

---

## 7. SECURITY CHECKLIST

- [ ] **GEMINI_API_KEY** set as **Secret** in Cloudflare (not plain text)
- [ ] **COACHING_SERVICE_API_KEY** set as **Secret** in Cloudflare
- [ ] Same **COACHING_API_KEY** set in Python service
- [ ] **Keys match** between Cloudflare and Python (test auth works)
- [ ] **Never commit** API keys to git (.env in .gitignore)
- [ ] **Rotate keys** periodically (every 90 days recommended)
- [ ] **Use HTTPS** for PYTHON_COACHING_SERVICE_URL in production

---

## 8. TROUBLESHOOTING

### "AI components not initialized" error:
```bash
# Check GEMINI_API_KEY is set correctly
python -c "import os; print('Key:', os.getenv('GEMINI_API_KEY')[:10] + '...')"
```

### "Invalid API key" when calling Python service:
```bash
# Keys must match exactly!
# In Cloudflare: COACHING_SERVICE_API_KEY
# In Python:     COACHING_API_KEY
# They should be THE SAME VALUE
```

### "Service not reachable" from Cloudflare:
```bash
# Check Python service is running
curl http://localhost:8000/health

# Check firewall allows port 8000
# Windows: Add firewall rule
# Linux: sudo ufw allow 8000

# Check Cloudflare Workers can reach it
# If localhost doesn't work, use your public IP or domain
```

### Keys not loading:
```bash
# Windows: Restart terminal after setx
# Mac/Linux: Run `source ~/.bashrc`
# Docker: Restart container
```

---

## 9. QUICK REFERENCE

### All Variables Needed:

**Cloudflare Workers:**
- `PYTHON_COACHING_SERVICE_URL` (plain text)
- `GEMINI_API_KEY` (secret)
- `COACHING_SERVICE_API_KEY` (secret)

**Python Service:**
- `GEMINI_API_KEY` (environment variable or .env)
- `COACHING_API_KEY` (environment variable or .env)
- `CLOUDFLARE_KV_API_URL` (optional)
- `CLOUDFLARE_API_TOKEN` (optional)

### Test Commands:

```bash
# Cloudflare
wrangler secret list

# Python
python -c "import os; print('Gemini:', bool(os.getenv('GEMINI_API_KEY'))); print('Coaching:', bool(os.getenv('COACHING_API_KEY')))"

# Health Check
curl http://localhost:8000/health
```

---

## ✅ READY TO TEST

Once all environment variables are set:

1. **Start Python service**: `python coaching_service.py`
2. **Deploy backend**: `npm run deploy`
3. **Test in web app**: Upload video → Analyze for Coaching
4. **Check logs**: `wrangler tail` (backend) and terminal (Python service)

**You should see coaching jobs flowing through the system!** 🎉

---

## 💡 PRO TIP

For local development, use this simple test script:

```bash
# test-env.sh
#!/bin/bash

echo "Testing Environment Variables..."
echo ""

echo "Backend (Cloudflare):"
echo "  PYTHON_COACHING_SERVICE_URL: $(grep PYTHON_COACHING_SERVICE_URL backend/wrangler.toml | cut -d'=' -f2)"
echo "  Secrets: $(cd backend && wrangler secret list 2>/dev/null | tail -n +2 | wc -l) set"

echo ""
echo "Python Service:"
echo "  GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
echo "  COACHING_API_KEY: ${COACHING_API_KEY:0:10}..."

echo ""
echo "Python Service Status:"
curl -s http://localhost:8000/health 2>/dev/null | python -m json.tool || echo "  Service not running"
```

Run with: `bash test-env.sh`

---

**Environment setup complete! Ready for deployment testing.** 🚀
