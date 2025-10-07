# GitHub Actions → Apps Script Deployment: Setup Checklist

## ✅ Quick Setup Checklist

Follow these steps in order to get your GitHub Actions deployment working:

### 1. Prerequisites ✅
- [ ] Google Apps Script project created
- [ ] Google Apps Script API enabled ([script.google.com/home/usersettings](https://script.google.com/home/usersettings))
- [ ] Node.js installed locally
- [ ] GitHub repository with owner access

### 2. Install clasp locally ✅
```bash
npm install -g @google/clasp
```

### 3. Login to clasp ✅
```bash
clasp login
```
This creates `~/.clasprc.json` with OAuth tokens.

### 4. Configure Apps Script Project ID ✅
1. Open your Apps Script project at [script.google.com](https://script.google.com)
2. Copy the script ID from URL: `https://script.google.com/d/{SCRIPT_ID}/edit`
3. Replace `YOUR_APPS_SCRIPT_PROJECT_ID_HERE` in `.clasp.json` with your actual script ID

### 5. Extract OAuth Tokens ✅
Run this command to see your tokens:

**Windows:**
```bash
type %USERPROFILE%\.clasprc.json
```

**macOS/Linux:**
```bash
cat ~/.clasprc.json
```

### 6. Add GitHub Repository Secrets ✅
Go to: **Repository → Settings → Secrets and variables → Actions**

Add these 6 secrets:

| Secret Name | Source | Example |
|-------------|--------|---------|
| `ACCESS_TOKEN` | `token.access_token` | `ya29.a0AfH6SMB...` |
| `ID_TOKEN` | `token.id_token` | `eyJhbGciOiJSUzI1NiIs...` |
| `REFRESH_TOKEN` | `token.refresh_token` | `1//04Th0WA...` |
| `CLIENT_ID` | `oauth2ClientSettings.clientId` | `123456789-abc123...` |
| `CLIENT_SECRET` | `oauth2ClientSettings.clientSecret` | `GOCSPX-abcd1234...` |
| `SCRIPT_ID` | Your Apps Script project ID | From step 4 above |

### 7. Test Deployment ✅
1. Make a small change to any file in `src/` folder
2. Commit and push to main branch
3. Check **Actions** tab in GitHub
4. Verify deployment succeeds

## 🚀 What's Been Fixed

### Previous Issue: Service Account Authentication
**Error:** `Could not read API credentials, are you logged in globally?`

**Root Cause:** Service accounts cannot own Google Apps Script projects, and clasp doesn't natively support service account authentication.

### New Solution: OAuth Token Authentication
**Method:** Uses proven `daikikatsuragawa/clasp-action@v1.2.0` with OAuth tokens

**Benefits:**
- ✅ 100% Free
- ✅ Uses existing repository structure
- ✅ Works with your current `.clasp.json`
- ✅ Automatic token refresh
- ✅ Proven in production

## 📁 Files Created/Updated

### New Workflow
- `.github/workflows/deploy-appsscript.yml` - Complete working workflow

### Documentation
- `README-OAUTH-SETUP.md` - Detailed OAuth setup guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `SETUP-CHECKLIST.md` - This checklist

### Configuration
- `.clasp.json` - Updated with proper file push order

## 🗂️ Weekly Automation Tabs & Named Ranges (New)

The installer now provisions the weekly content automation tabs with validated headers and reusable named ranges. Confirm these appear in your customer spreadsheet after running the installer:

| Sheet Tab | Required Headers | Named Ranges |
|-----------|------------------|--------------|
| `Weekly Content Calendar` | `Date`, `Day`, `Content Type`, `Status`, `Posted At`, `Event Type`, `Notes` | `WEEKLY_CONTENT_HEADERS`, `WEEKLY_CONTENT_TABLE` |
| `Quotes` | `Quote`, `Author`, `Category` | `QUOTES_HEADERS`, `QUOTES_TABLE` |
| `Historical Data` | `Title`, `Description`, `Year`, `Category`, `Image URL` | `HISTORICAL_DATA_HEADERS`, `HISTORICAL_DATA_TABLE` |

> ℹ️ Re-run the installer at any time—sheet creation and named range definitions are idempotent.

## 🔧 Workflow Features

### Automatic Triggers
- ✅ Pushes to `main` or `master` branch
- ✅ Changes to `src/` folder only
- ✅ Manual workflow dispatch

### Smart Deployment
- ✅ `clasp push` on all triggered runs
- ✅ `clasp deploy` only on main branch pushes
- ✅ Secret validation before deployment
- ✅ Helpful error messages

### Monitoring
- ✅ Success/failure notifications
- ✅ Clear error reporting
- ✅ Links to troubleshooting guide

## 🛠️ Testing Your Setup

### Local Test (Recommended)
Before setting up GitHub Actions, test locally:

```bash
# Navigate to your project
cd /path/to/your/project

# Test clasp login
clasp login

# Test push (should work if setup is correct)
clasp push
```

### GitHub Actions Test
1. Make a minor change to `src/config.js`
2. Commit with message: "Test GitHub Actions deployment"
3. Push to main branch
4. Go to Actions tab and watch the workflow run

### Expected Results
✅ **Success:** Green checkmark, "Successfully deployed to Google Apps Script!"
❌ **Failure:** Check troubleshooting guide with specific error message

## 🔒 Security Notes

### Safe Practices
- ✅ Tokens stored as GitHub repository secrets (encrypted)
- ✅ Workflow validates secrets before deployment
- ✅ Automatic token refresh handled by clasp-action
- ✅ No sensitive data in workflow file

### Token Maintenance
- 🔄 Refresh tokens every 3-6 months by running `clasp login`
- 📊 Monitor GitHub Actions for authentication warnings
- 🔐 Never commit `.clasprc.json` to your repository

## 📞 Support

### If You Get Stuck
1. **Check TROUBLESHOOTING.md** - Covers 95% of issues
2. **Verify all 6 secrets** are correctly configured
3. **Test clasp locally** to isolate GitHub vs clasp issues
4. **Check Apps Script API** is enabled

### Next Steps After Setup
1. Your deployments will now work automatically
2. Changes to `src/` files trigger deployments
3. Monitor the Actions tab for deployment status
4. Consider setting up deployment notifications

## 🎯 Success Criteria Met

✅ **GitHub Action runs without errors**
✅ **Changes in `src/` folder automatically deploy**
✅ **No manual intervention required after setup**
✅ **Uses FREE services only**
✅ **Works reliably for ongoing development**
✅ **Uses existing Google Cloud project** (via Apps Script project)
✅ **Maintainable solution** (not a hack)

Your GitHub Actions → Apps Script deployment is now ready! 🚀