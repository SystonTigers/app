# Tenant Onboarding Guide

This guide helps club managers set up their SystonApp tenant for the first time.

## Prerequisites

- You should have received a setup link via email from your platform administrator
- The setup link is valid for the time specified in your invitation (typically 60 minutes to 7 days)
- Have your Make.com webhook URL ready if you're using BYO-Make mode (optional)

## Step 1: Access Your Setup Link

Click the setup link provided in your invitation email. It should look like:
```
https://setup-console.yourbrand.com/?token=eyJ...
```

**Important:** This link expires after the specified time period, so complete setup promptly.

## Step 2: Choose Your Integration Mode

You'll see two options:

### Option A: Managed Mode (Recommended)
- Platform handles all social media posting automatically
- Direct YouTube integration via OAuth
- No external automation tools required
- Best for clubs that want a simple, hands-off experience

**To select:** Click "Use Managed Mode"

### Option B: BYO-Make (Bring Your Own Make.com)
- You provide your own Make.com webhook URL
- Greater control and customization
- Requires Make.com account and scenario setup
- Best for clubs with existing automation workflows

**To select:** Click "Use BYO-Make Mode"

## Step 3: Configure (If Using BYO-Make)

If you selected BYO-Make mode:

1. **Get your Make.com webhook URL:**
   - Log into your Make.com account
   - Create a new scenario with a Webhook trigger
   - Copy the webhook URL (e.g., `https://hook.eu2.make.com/...`)

2. **Enter the webhook URL** in the setup form

3. **Test the connection** by clicking "Test Webhook"
   - You should see a success message
   - Check your Make.com scenario to verify the test ping arrived

4. **Save** your configuration

## Step 4: Connect YouTube (Managed Mode Only)

If you chose Managed Mode:

1. Click "Connect YouTube Account"
2. Sign in with your club's Google account
3. Grant the necessary permissions
4. Verify the connection succeeded

## Known Limits & Quotas

### YouTube
- **Quota:** 10,000 units/day (API quota)
- **Video size:** Max 256 GB or 12 hours
- **Supported formats:** MP4, AVI, MOV, FLV, 3GP, WebM, MPEG-PS

### Gallery/Media
- **Image size:** Max 10 MB per photo
- **Supported formats:** JPEG, PNG, WebP
- **Albums:** Unlimited (KV-backed)

### Rate Limits
- **Posts:** 60/minute per tenant (configurable)
- **Uploads:** 20/minute per tenant (configurable)

## Troubleshooting

### Setup link expired
Contact your platform administrator to generate a new invitation link.

### Webhook test failed
- Verify the webhook URL is correct
- Ensure it's a Make.com or approved webhook host
- Check that your Make.com scenario is active

### YouTube connection failed
- Ensure you're using the correct Google account
- Check that the account has access to upload videos
- Verify YouTube API quota hasn't been exceeded

## Support

For assistance, contact your platform administrator at: `{support_email}`

---

**TODO:** Add screenshots for:
- Setup form (both modes)
- Make.com webhook URL location
- YouTube OAuth flow
- Success confirmation page
