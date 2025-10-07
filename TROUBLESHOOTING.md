# GitHub Actions → Apps Script Deployment Troubleshooting

## Common Issues and Solutions

### 🔴 "Missing required secrets" Error

**Error Message:**
```
❌ Missing required secrets. Please check README-OAUTH-SETUP.md for setup instructions.
```

**Solution:**
1. Verify all 6 repository secrets are configured:
   - `ACCESS_TOKEN`
   - `ID_TOKEN`
   - `REFRESH_TOKEN`
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `SCRIPT_ID`

2. Go to: Repository → Settings → Secrets and variables → Actions
3. Check that each secret exists and has a value
4. Re-add any missing secrets following the OAuth setup guide

### 🔴 "Could not read API credentials" Error

**Error Message:**
```
Could not read API credentials, are you logged in globally?
```

**Root Cause:** Invalid or expired OAuth tokens

**Solution:**
1. Run `clasp login` locally to generate fresh tokens
2. Extract new values from `~/.clasprc.json`
3. Update all 5 token secrets in GitHub:
   - `ACCESS_TOKEN`
   - `ID_TOKEN`
   - `REFRESH_TOKEN`
   - `CLIENT_ID`
   - `CLIENT_SECRET`

### 🔴 "Script not found" Error

**Error Message:**
```
Request to scripts.googleapi.com failed with error: Script not found
```

**Solution:**
1. Verify `SCRIPT_ID` secret contains the correct Apps Script project ID
2. Check `.clasp.json` has the right `scriptId`
3. Ensure your Apps Script project exists and is accessible
4. Make sure the Google account used for OAuth has access to the script

### 🔴 "Access denied" or "Permission denied" Error

**Solutions:**

**Option 1: Check Apps Script API**
1. Go to [Google Apps Script Settings](https://script.google.com/home/usersettings)
2. Ensure "Google Apps Script API" is turned ON

**Option 2: Re-authenticate with broader scope**
```bash
clasp logout
clasp login --creds credentials.json  # If you have custom OAuth credentials
# OR
clasp login  # Use default credentials
```

**Option 3: Check script permissions**
- Ensure the Google account has Editor access to the Apps Script project
- If using a shared project, verify permissions

### 🔴 "Invalid grant" Error

**Error Message:**
```
Error: Invalid grant
```

**Root Cause:** Expired refresh token

**Solution:**
1. The refresh token has expired (usually after 6 months of inactivity)
2. Run `clasp logout && clasp login` locally
3. Update all OAuth secrets with fresh tokens

### 🔴 "Authentication failed" Error

**Possible Causes:**

**1. Copy-paste errors:**
- Extra spaces or line breaks in GitHub secrets
- Truncated token values
- Wrong secret names

**2. Token format issues:**
- Tokens must be exactly as they appear in `.clasprc.json`
- No quotes around the values in GitHub secrets

**Solution:**
1. Re-copy tokens carefully from `.clasprc.json`
2. Use a text editor to verify no extra characters
3. Update GitHub secrets one by one

### 🔴 Workflow doesn't trigger

**Check these conditions:**

**1. File changes:**
- Changes must be in the `src/` folder
- Workflow only triggers on `src/**` path changes

**2. Branch targeting:**
- Workflow only runs on `main` or `master` branches
- Check your default branch name

**3. Workflow file location:**
- Must be in `.github/workflows/deploy-appsscript.yml`
- Check file is committed to the main branch

### 🔴 "Rate limit exceeded" Error

**Solution:**
1. Wait a few minutes and retry
2. Consider reducing deployment frequency
3. The clasp action has built-in retry logic

### 🔴 "Deploy works for max. 20 deployments" Warning

**Root Cause:** Google Apps Script limits active deployments

**Solution:**
1. Delete old deployments in Apps Script editor
2. Go to Deploy → Manage deployments
3. Archive or delete unused versions
4. This only affects the `deploy` command, not `push`

## Diagnostic Steps

### Step 1: Verify Local Setup

Test that clasp works locally:

```bash
# Check if logged in
clasp login

# Test pushing to your script
clasp push

# If this works, the issue is with GitHub secrets
```

### Step 2: Check GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Verify all 6 secrets exist:
   ```
   ACCESS_TOKEN        ✓ Set
   CLIENT_ID          ✓ Set
   CLIENT_SECRET      ✓ Set
   ID_TOKEN           ✓ Set
   REFRESH_TOKEN      ✓ Set
   SCRIPT_ID          ✓ Set
   ```

### Step 3: Test Workflow Manually

1. Go to Actions tab in your repository
2. Select "Deploy to Google Apps Script" workflow
3. Click "Run workflow" button
4. Run on the main branch
5. Check the logs for specific errors

### Step 4: Validate .clasp.json

Your `.clasp.json` should look like:
```json
{
  "scriptId": "your-actual-script-id-here",
  "rootDir": "./src",
  "projectId": "",
  "fileExtension": "gs",
  "filePushOrder": [
    "config.js",
    "utils.gs",
    "logger.gs",
    "main.gs"
  ]
}
```

## Advanced Troubleshooting

### Enable Debug Logging

Add this step to your workflow for more verbose output:

```yaml
- name: Debug clasp version and auth
  run: |
    npm list -g @google/clasp
    echo "Clasp version check complete"
```

### Alternative Authentication Test

If OAuth continues to fail, test with the alternative `--adc` approach:

```yaml
- name: Authenticate with Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.APPSCRIPT_CREDS_JSON_B64 }}

- name: Set up Cloud SDK
  uses: google-github-actions/setup-gcloud@v2

- name: Test clasp with ADC
  run: |
    npm install -g @google/clasp
    clasp push --adc
```

### Check Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Verify your OAuth 2.0 client is properly configured
4. Check that Apps Script API is enabled

## Getting Help

### When to Contact Support

If you've tried all troubleshooting steps and still get errors:

1. **Document the exact error message**
2. **Note which step fails** (authentication, push, deploy)
3. **Include your workflow run logs**
4. **Verify your .clasp.json and folder structure**

### Community Resources

- [Google Apps Script Community](https://groups.google.com/g/google-apps-script-community)
- [Clasp GitHub Issues](https://github.com/google/clasp/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-apps-script)

## Prevention Tips

### Regular Maintenance

1. **Test monthly:** Run a test deployment to catch token expiration early
2. **Monitor logs:** Check GitHub Actions regularly for warnings
3. **Update tokens:** Refresh OAuth tokens every 3-6 months

### Best Practices

1. **Use descriptive commit messages** for easier debugging
2. **Test changes locally** with `clasp push` before committing
3. **Keep backup of working tokens** in a secure location
4. **Document any custom configurations** in your team

### Monitoring Setup

Add this to your workflow for better monitoring:

```yaml
- name: Notify on failure
  if: failure()
  run: |
    echo "::error::Deployment failed. Check troubleshooting guide."
    echo "::error::Log URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

This guide should resolve 95% of common deployment issues. For persistent problems, the issue is usually with token extraction or GitHub secrets configuration.