# Setting Up Syston Tigers Tenant

## Option 1: Use the API (Automated)

```bash
curl -X POST https://syston-backend.syston-tigers.workers.dev/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "clubName": "Syston Tigers U16",
    "clubShortName": "syston-tigers",
    "contactEmail": "danny@systontigers.co.uk",
    "contactName": "Danny Clayton",
    "locale": "en-GB",
    "timezone": "Europe/London",
    "plan": "free",
    "makeWebhookUrl": "YOUR_MAKE_WEBHOOK_URL"
  }'
```

## Option 2: Manual Setup (Backend locally)

Run from the backend directory:

```bash
cd backend

# Create tenant via Wrangler command
npx wrangler kv:key put "tenant:syston-tigers" '{
  "id": "syston-tigers",
  "name": "Syston Tigers U16",
  "locale": "en-GB",
  "tz": "Europe/London",
  "flags": {
    "use_make": true,
    "direct_yt": false
  },
  "makeWebhookUrl": null,
  "metadata": {
    "contactEmail": "danny@systontigers.co.uk",
    "contactName": "Danny Clayton",
    "plan": "free",
    "createdAt": "2025-10-10T14:00:00Z",
    "provisionedBy": "manual"
  }
}' --namespace-id 5948d4a91ac04b50904a06c923221994
```

## What You'll Get Back

The API will return:
- `adminJWT` - Your admin token (save this!)
- `automationJWT` - Token for Apps Script
- `setupUrl` - URL to complete setup
- `adminConsoleUrl` - Admin dashboard URL

## Update Mobile App Config

After tenant is created, update `mobile/src/config.ts`:

```typescript
export const API_BASE_URL = 'https://syston-backend.syston-tigers.workers.dev';
export const TENANT_ID = 'syston-tigers';
```

## Test the Tenant

```bash
# Test tenant exists
curl https://syston-backend.syston-tigers.workers.dev/api/v1/healthz

# Test with tenant ID
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  https://syston-backend.syston-tigers.workers.dev/api/v1/feed?tenant=syston-tigers
```
