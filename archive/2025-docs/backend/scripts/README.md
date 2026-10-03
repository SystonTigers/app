# Backend Scripts

## Manual Tenant Provisioning

For beta launch, use the manual provisioning script to create tenants securely.

### Prerequisites

1. Set environment variables:
```bash
export SERVICE_JWT_SECRET="your-jwt-secret"  # Same as JWT_SECRET in wrangler
export BACKEND_URL="https://your-worker.workers.dev"
export JWT_ISSUER="syston.app"  # Optional, defaults to syston.app
```

2. Ensure you have Node.js 18+ installed

### Usage

```bash
# Navigate to backend directory
cd backend

# Run the provisioning script
node scripts/provision-tenant.js
```

### Interactive Prompts

The script will ask for:
- **Tenant ID**: Lowercase alphanumeric with hyphens (e.g., `demo-fc`)
- **Tenant Name**: Display name (e.g., `Demo Football Club`)
- **Contact Email**: Owner's email address
- **Contact Name**: Owner's full name
- **Plan**: `starter`, `pro`, or `enterprise` (default: `starter`)
- **Colors**: Optional primary and secondary brand colors

### Output

On success, the script outputs:
1. Tenant configuration details
2. **Admin JWT** - Share this with the tenant owner (60-day expiry)
3. JWT expiration timestamp

### Example Session

```bash
$ node scripts/provision-tenant.js
=== Manual Tenant Provisioning ===

Tenant ID (lowercase, alphanumeric with hyphens): beta-fc-1
Tenant Name (e.g., "Demo Football Club"): Beta Football Club
Contact Email: owner@beta-fc.com
Contact Name: John Smith
Plan (starter/pro/enterprise) [starter]: pro
Primary Color (optional, e.g., #FF0000): #E63946
Secondary Color (optional, e.g., #0000FF): #1D3557

--- Summary ---
Tenant ID: beta-fc-1
Name: Beta Football Club
Contact: John Smith <owner@beta-fc.com>
Plan: pro
Colors: #E63946 / #1D3557

Proceed? (yes/no): yes

🔐 Generating platform admin JWT...
📡 Calling backend API...

✅ Tenant created successfully!

--- Tenant Details ---
{
  "id": "beta-fc-1",
  "name": "Beta Football Club",
  ...
}

--- Admin JWT (Share with tenant owner) ---
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

--- JWT Expires At ---
2025-03-05T12:00:00.000Z

💡 Tip: The owner can use /whoami endpoint to verify their JWT
```

### Security Notes

1. **Keep SERVICE_JWT_SECRET secure** - Never commit it to git
2. **Admin JWT is sensitive** - Share it securely (encrypted email, password manager, etc.)
3. **60-day expiry** - Tenants have 60 days to set up their account before needing a new JWT
4. The script generates a short-lived (5 min) platform-admin JWT for the API call

### Troubleshooting

**Error: SERVICE_JWT_SECRET environment variable is required**
- Set the `SERVICE_JWT_SECRET` or `JWT_SECRET` environment variable

**Error: BACKEND_URL environment variable is required**
- Set `BACKEND_URL` to your deployed Worker URL

**401 Unauthorized**
- Check that `SERVICE_JWT_SECRET` matches the `JWT_SECRET` in your Cloudflare Worker

**409 Conflict**
- Tenant ID already exists. Choose a different ID.

**400 Validation Error**
- Check that tenant ID is lowercase alphanumeric with hyphens only
- Verify email format is valid

### Testing the JWT

Tenant owners can verify their JWT works:

```bash
curl https://your-worker.workers.dev/whoami \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

Should return:
```json
{
  "success": true,
  "data": {
    "sub": "...",
    "aud": "syston-mobile",
    "roles": ["tenant_admin", "owner"],
    "tenantId": "beta-fc-1",
    ...
  }
}
```

## Health Check

Check backend health:
```bash
curl https://your-worker.workers.dev/health
```

Returns:
```json
{
  "ok": true,
  "version": "7.0.0",
  "environment": "production",
  "timestamp": "2025-01-05T12:00:00.000Z"
}
```
