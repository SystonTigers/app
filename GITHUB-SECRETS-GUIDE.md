# GitHub Repository Secrets Setup Guide

## Navigate to Secrets Settings

1. Go to your GitHub repository: `https://github.com/SystonTigers/Automation_script`
2. Click **Settings** tab (top of repository page)
3. In left sidebar, click **Secrets and variables**
4. Click **Actions**

## Add Each Secret

For each of the 6 secrets below, click **"New repository secret"**:

### Required Secrets

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `ACCESS_TOKEN` | OAuth access token | `token.access_token` from .clasprc.json |
| `ID_TOKEN` | OAuth ID token | `token.id_token` from .clasprc.json |
| `REFRESH_TOKEN` | OAuth refresh token | `token.refresh_token` from .clasprc.json |
| `CLIENT_ID` | OAuth client identifier | `oauth2ClientSettings.clientId` from .clasprc.json |
| `CLIENT_SECRET` | OAuth client secret | `oauth2ClientSettings.clientSecret` from .clasprc.json |
| `SCRIPT_ID` | Apps Script project ID | From your Apps Script project URL |

## Example .clasprc.json Structure

When you run `cat ~/.clasprc.json`, you'll see something like:

```json
{
  "token": {
    "access_token": "ya29.a0AfH6SMBexampleToken123",     ← Copy this
    "refresh_token": "1//04Th0WAexampleRefresh456",      ← Copy this
    "scope": "https://www.googleapis.com/auth/script.projects",
    "token_type": "Bearer",
    "id_token": "eyJhbGciOiJSUzI1NiIsKidToken789",       ← Copy this
    "expiry_date": 1640995200000
  },
  "oauth2ClientSettings": {
    "clientId": "123456789-abcdef.apps.googleusercontent.com",  ← Copy this
    "clientSecret": "GOCSPX-example1234Secret",                ← Copy this
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

## Adding Steps

1. Click **"New repository secret"**
2. Enter **Name** (e.g., `ACCESS_TOKEN`)
3. Enter **Secret** (paste the token value)
4. Click **"Add secret"**
5. Repeat for all 6 secrets

## Verification

After adding all secrets, you should see:
- ✅ ACCESS_TOKEN
- ✅ CLIENT_ID
- ✅ CLIENT_SECRET
- ✅ ID_TOKEN
- ✅ REFRESH_TOKEN
- ✅ SCRIPT_ID

## Security Notes

- Never share these token values
- They're encrypted in GitHub repository secrets
- The workflow will use them securely