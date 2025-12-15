# OAuth Setup Guide for GitHub Actions → Apps Script Deployment

## Overview

This guide explains how to set up OAuth token authentication for automatically deploying your Google Apps Script project via GitHub Actions. You'll extract OAuth tokens from your local clasp login and add them as GitHub repository secrets.

## Prerequisites

- Google Apps Script project already created
- Node.js and npm installed locally
- Google Apps Script API enabled
- Owner access to the GitHub repository

## Step 1: Install clasp locally

```bash
npm install -g @google/clasp
```

## Step 2: Enable Google Apps Script API

1. Visit [Google Apps Script Settings](https://script.google.com/home/usersettings)
2. Turn ON "Google Apps Script API"

## Step 3: Login to clasp locally

```bash
clasp login
```

This will:
- Open your browser for Google OAuth consent
- Create a `.clasprc.json` file in your home directory
- Store OAuth tokens needed for authentication

## Step 4: Extract OAuth tokens

### On Windows:
```bash
type %USERPROFILE%\.clasprc.json
```

### On macOS/Linux:
```bash
cat ~/.clasprc.json
```

You should see something like this:
```json
{
  "token": {
    "access_token": "ya29.a0AfH6SMB...",
    "refresh_token": "1//04Th0WA...",
    "scope": "https://www.googleapis.com/auth/script.projects",
    "token_type": "Bearer",
    "id_token": "eyJhbGciOiJSUzI1NiIsImtp...",
    "expiry_date": 1640995200000
  },
  "oauth2ClientSettings": {
    "clientId": "123456789-abc123def456.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-abcd1234efgh5678ijkl",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

## Step 5: Get your Apps Script ID

Your `.clasp.json` should already have the `scriptId`. If not:

1. Open your Apps Script project at [script.google.com](https://script.google.com)
2. Copy the script ID from the URL: `https://script.google.com/d/{SCRIPT_ID}/edit`

## Step 6: Add GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these 6 secrets:

| Secret Name | Value | Source |
|-------------|-------|---------|
| `ACCESS_TOKEN` | `ya29.a0AfH6SMB...` | `token.access_token` from .clasprc.json |
| `ID_TOKEN` | `eyJhbGciOiJSUzI1NiIs...` | `token.id_token` from .clasprc.json |
| `REFRESH_TOKEN` | `1//04Th0WA...` | `token.refresh_token` from .clasprc.json |
| `CLIENT_ID` | `123456789-abc123def456...` | `oauth2ClientSettings.clientId` from .clasprc.json |
| `CLIENT_SECRET` | `GOCSPX-abcd1234efgh...` | `oauth2ClientSettings.clientSecret` from .clasprc.json |
| `SCRIPT_ID` | Your Apps Script project ID | From .clasp.json or Apps Script URL |

### Adding Secrets:

1. Click "New repository secret"
2. Enter the secret name (e.g., `ACCESS_TOKEN`)
3. Paste the corresponding value
4. Click "Add secret"
5. Repeat for all 6 secrets

## Step 7: Verify Setup

1. Make a change to any file in the `src/` folder
2. Commit and push to the main branch
3. Check Actions tab to see if deployment succeeds

## Example .clasprc.json Structure

Here's what your tokens should look like when properly formatted:

```json
{
  "token": {
    "access_token": "ya29.a0AfH6SMBexampleToken123",
    "refresh_token": "1//04Th0WAexampleRefreshToken456",
    "scope": "https://www.googleapis.com/auth/script.projects",
    "token_type": "Bearer",
    "id_token": "eyJhbGciOiJSUzI1NiIsKidTokenExample789",
    "expiry_date": 1640995200000
  },
  "oauth2ClientSettings": {
    "clientId": "123456789-abcdef123456.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-example1234Secret5678",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Keep .clasprc.json private** - Never commit this file to your repository
2. **Tokens have expiration** - The workflow will automatically refresh them
3. **Rotate tokens periodically** - Run `clasp login` again every few months
4. **Use repository secrets** - Never hardcode tokens in your workflow file

## Troubleshooting

### Missing .clasprc.json file
- Run `clasp logout` then `clasp login` again
- Make sure Google Apps Script API is enabled

### "Invalid credentials" error
- Check that all 6 secrets are correctly copied
- Verify no extra spaces or characters in the secret values

### "Script not found" error
- Verify the `SCRIPT_ID` secret matches your Apps Script project ID
- Ensure your Apps Script project is accessible

### Token expiration
- The refresh token should automatically handle this
- If still failing, run `clasp login` locally and update the secrets

## Next Steps

Once setup is complete:
1. Your GitHub Actions will automatically deploy on pushes to main branch
2. Changes to `src/` files will trigger deployments
3. Check the Actions tab for deployment status
4. Review the troubleshooting guide if needed

## Alternative: Manual Token Refresh

If you need to refresh tokens manually:

```bash
# Logout and login again
clasp logout
clasp login

# Extract new tokens and update GitHub secrets
cat ~/.clasprc.json  # Copy new values to GitHub secrets
```

This setup provides a reliable, free solution for continuous deployment to Google Apps Script using GitHub Actions.