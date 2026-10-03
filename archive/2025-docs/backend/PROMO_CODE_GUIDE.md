# 🎟️ Promo Code System Guide

## **Quick Start - Create Essential Promo Codes**

### **1. Syston Gets Pro for Free**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SYSTON-PRO-2025",
    "type": "plan_upgrade",
    "value": "enterprise",
    "active": true,
    "metadata": {
      "description": "Syston Town Tigers - Free Enterprise Plan",
      "targetTenant": "syston"
    }
  }'
```

**Usage:**
```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "clubName": "Syston Town Tigers",
    "clubShortName": "syston",
    "contactEmail": "systontowntigersfc@gmail.com",
    "contactName": "Clayton",
    "plan": "free",
    "promoCode": "SYSTON-PRO-2025"
  }'
```

**Result:** Syston gets upgraded to `enterprise` plan automatically!

---

### **2. Referral Rewards - 3 Months Free**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "REFER-3MONTHS",
    "type": "months_free",
    "value": 3,
    "durationMonths": 3,
    "maxUses": null,
    "active": true,
    "metadata": {
      "description": "Referral reward - 3 months free"
    }
  }'
```

**Usage:** Anyone who signs up with code `REFER-3MONTHS` gets 3 months free.

---

### **3. Launch Discount - 50% Off for 6 Months**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "type": "percentage_discount",
    "value": 50,
    "durationMonths": 6,
    "maxUses": 100,
    "expiresAt": "2025-12-31T23:59:59Z",
    "active": true,
    "metadata": {
      "description": "Launch promotion - 50% off for first 6 months"
    }
  }'
```

---

### **4. Limited-Time Offer - First 10 Signups Get Pro**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "FIRST10-PRO",
    "type": "plan_upgrade",
    "value": "enterprise",
    "maxUses": 10,
    "durationMonths": 12,
    "active": true,
    "metadata": {
      "description": "First 10 signups get Enterprise for 1 year"
    }
  }'
```

---

## **Promo Code Types**

| Type | Value Type | Description | Example |
|------|------------|-------------|---------|
| `percentage_discount` | `number` (1-100) | X% off subscription | `50` = 50% off |
| `months_free` | `number` | X months completely free | `3` = 3 months free |
| `plan_upgrade` | `string` | Upgrade to specific plan | `"enterprise"` |
| `referral_reward` | `number` | Months free for referrals | `3` = 3 months |

---

## **Promo Code Properties**

```typescript
{
  code: string;              // Unique code (UPPERCASE, alphanumeric + hyphens)
  type: PromoCodeType;       // See table above
  value: string | number;    // Depends on type
  durationMonths?: number;   // How long discount lasts (null = forever)
  maxUses?: number;          // Max redemptions (null = unlimited)
  expiresAt?: string;        // ISO date (null = never expires)
  active: boolean;           // Enable/disable code
  metadata?: {
    description?: string;    // What this code is for
    targetTenant?: string;   // Limit to specific tenant
    referredBy?: string;     // Who created referral code
  }
}
```

---

## **Managing Promo Codes**

### **List All Promo Codes**

```bash
curl https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/list \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "SYSTON-PRO-2025",
      "type": "plan_upgrade",
      "value": "enterprise",
      "usedCount": 1,
      "active": true,
      "createdAt": "2025-10-04T12:00:00Z",
      "metadata": {
        "description": "Syston free pro",
        "targetTenant": "syston"
      }
    }
  ]
}
```

### **Deactivate a Promo Code**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/LAUNCH50/deactivate \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

---

## **Referral System**

### **How It Works**

1. **User Signs Up** → Gets tenant created
2. **You Generate Referral Code** → Give them a unique code
3. **They Share Code** → Friends use it during signup
4. **Original User Gets Reward** → Track in metadata

### **Generate Referral Code for a Tenant**

```javascript
// Example: Create referral code for tenant "club-a"
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "REFER-CLUB-A-XYZ",
    "type": "referral_reward",
    "value": 3,
    "durationMonths": 3,
    "active": true,
    "metadata": {
      "description": "Club A referral - 3 months free",
      "referredBy": "club-a"
    }
  }'
```

### **Track Referral Success**

When someone uses code `REFER-CLUB-A-XYZ`:
- Code metadata shows `"referredBy": "club-a"`
- You can query KV for `promo-redemption:*:REFER-CLUB-A-XYZ` to see who used it
- Reward the original referrer

---

## **Common Scenarios**

### **Black Friday Sale**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BLACKFRIDAY2025",
    "type": "percentage_discount",
    "value": 75,
    "durationMonths": 12,
    "expiresAt": "2025-11-30T23:59:59Z",
    "active": true,
    "metadata": {
      "description": "Black Friday - 75% off for 1 year"
    }
  }'
```

### **Partner Discount**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PARTNER-LEICESTER-FA",
    "type": "plan_upgrade",
    "value": "managed",
    "maxUses": 50,
    "active": true,
    "metadata": {
      "description": "Leicester FA partnership - Managed plan for 50 clubs"
    }
  }'
```

### **Early Bird Special**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EARLYBIRD100",
    "type": "months_free",
    "value": 6,
    "maxUses": 100,
    "expiresAt": "2025-11-01T00:00:00Z",
    "active": true,
    "metadata": {
      "description": "First 100 signups get 6 months free"
    }
  }'
```

---

## **Testing Promo Codes**

### **1. Create a Test Code**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/promo/create \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST-CODE",
    "type": "months_free",
    "value": 1,
    "maxUses": 5,
    "active": true
  }'
```

### **2. Test Signup with Code**

```bash
curl -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "clubName": "Test Club",
    "clubShortName": "test-club",
    "contactEmail": "test@example.com",
    "contactName": "Test User",
    "promoCode": "TEST-CODE"
  }'
```

### **3. Verify Code Was Applied**

Check response `metadata.promoCode` field and `metadata.plan` field.

---

## **API Endpoints Summary**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/signup` | None | Signup with optional `promoCode` |
| `POST` | `/api/v1/admin/promo/create` | Admin JWT | Create new promo code |
| `GET` | `/api/v1/admin/promo/list` | Admin JWT | List all promo codes |
| `POST` | `/api/v1/admin/promo/:code/deactivate` | Admin JWT | Deactivate promo code |

---

## **Next Steps**

1. **Deploy Backend** with promo code system
2. **Create Syston Code** using first example above
3. **Generate Referral Codes** for existing customers
4. **Test Signup Flow** with promo codes
5. **Track Usage** via admin list endpoint

---

**Questions?** The promo code system is fully functional and ready to use!
