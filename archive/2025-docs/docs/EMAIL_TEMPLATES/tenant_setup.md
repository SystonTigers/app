# Tenant Setup Email Template

Use this template when inviting a new club/organization to join your platform.

---

**Subject:** Welcome to {platform_name} - Complete Your Setup

**Body:**

Hi {club_name} Admin,

Welcome to {platform_name}! We're excited to have you on board.

To complete your club's setup, please follow these steps:

## 1. Click Your Setup Link

Your personalized setup link is ready:

**[Complete Setup Now]({setup_link})**

⏰ **Important:** This link expires in {expiry_hours} hours for security purposes.

## 2. Choose Your Integration Mode

You'll have two options:

- **Managed Mode (Recommended):** We handle all social media posting for you
- **BYO-Make:** Bring your own Make.com webhook for custom workflows

Most clubs choose Managed Mode for simplicity.

## 3. Connect Your Accounts

If using Managed Mode, you'll connect your club's YouTube account via Google OAuth. This takes just 2 minutes.

If using BYO-Make, you'll paste your Make.com webhook URL and test the connection.

## Need Help?

- **Setup Guide:** {docs_link}
- **Support Email:** {support_email}
- **Support Hours:** Monday-Friday, 9am-5pm GMT

## What You Get

✅ Multi-channel social posting (YouTube, Facebook, Instagram, TikTok, X)  
✅ Photo gallery with unlimited albums  
✅ Team chat rooms (parents, coaches)  
✅ Event management with RSVP tracking  
✅ Live match updates  
✅ Man of the Match voting  

## Your Club Details

- **Tenant ID:** {tenant_id}
- **Admin Email:** {admin_email}
- **Setup Link Valid Until:** {expiry_datetime}

Questions? Just reply to this email.

Best regards,  
{platform_name} Team

---

## Placeholder Reference

When sending this email, replace:

- `{platform_name}` - Your platform's name (e.g., "SystonApp")
- `{club_name}` - The club/organization name (e.g., "Riverside FC")
- `{setup_link}` - The generated setup URL with token
- `{expiry_hours}` - Time until link expires (e.g., "24")
- `{docs_link}` - Link to ONBOARDING_TENANT.md docs
- `{support_email}` - Your support email address
- `{tenant_id}` - The tenant's unique ID
- `{admin_email}` - The admin's email address
- `{expiry_datetime}` - Human-readable expiry date/time

## Example with Values

```
Subject: Welcome to SystonApp - Complete Your Setup

Hi Riverside FC Admin,

Welcome to SystonApp! We're excited to have you on board.

Your personalized setup link is ready:
https://setup-console.yourbrand.com/?token=eyJhbGc...

⏰ Important: This link expires in 24 hours.

Questions? Email us at support@yourbrand.com

Best regards,
SystonApp Team
```
