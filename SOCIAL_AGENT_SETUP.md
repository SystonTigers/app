# 🤖 Social Media AI Agent Setup Guide

## Overview

Your app now has an AI-powered social media agent that automatically formats and posts content to multiple platforms! It uses **Google Gemini** (free tier) to adapt your posts for Twitter/X, Instagram, Facebook, and TikTok.

---

## ✅ What's Been Added

### 1. Backend Services
- ✅ `backend/src/services/socialAgent.ts` - AI agent powered by Gemini
- ✅ `backend/src/routes/social.ts` - New API endpoints for AI posting
- ✅ Usage limits per plan (Starter: 5/day, Pro: 20/day, Enterprise: 50/day)
- ✅ Automatic usage tracking (daily/monthly counters)

### 2. New API Endpoints
```
GET  /api/v1/social/config       - Get social platform toggles
PUT  /api/v1/social/config       - Update platform toggles
GET  /api/v1/social/usage        - Get usage stats and limits
POST /api/v1/social/post-with-ai - Post with AI formatting
```

### 3. Features
- ✅ AI formats content for each platform's style
- ✅ Per-tenant usage limits based on plan
- ✅ Platform enable/disable toggles
- ✅ Upgrade prompts when limits reached
- ✅ Free tier support (1,500 posts/day shared across all tenants)

---

## 🚀 Setup Instructions

### Step 1: Get Gemini API Key (FREE)

1. Go to **Google AI Studio**: https://makersuite.google.com/app/apikey
2. Click **"Get API Key"**
3. Click **"Create API key in new project"**
4. Copy the API key (looks like: `AIzaSy...`)
5. **No credit card required!** Free tier includes 1,500 requests/day

### Step 2: Add API Key to Cloudflare

#### Option A: Via Wrangler CLI (Recommended)
```bash
cd backend
npx wrangler secret put GEMINI_API_KEY
# Paste your API key when prompted
```

#### Option B: Via Cloudflare Dashboard
1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your `app` worker
3. Go to **Settings** → **Variables**
4. Click **"Add variable"**
5. Name: `GEMINI_API_KEY`
6. Value: Your API key
7. Check **"Encrypt"**
8. Click **"Save"**

### Step 3: Deploy Backend

```bash
cd backend
npm run deploy
# Or
npx wrangler deploy
```

### Step 4: Test the API

```bash
# Test AI posting (requires auth token)
curl -X POST https://your-worker.workers.dev/api/v1/social/post-with-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant: demo" \
  -d '{
    "content": "Great win today! 3-1 victory! ⚽",
    "platforms": ["twitter", "instagram"],
    "media": []
  }'
```

---

## 📊 Usage Limits (Free Tier)

### Per-Plan Limits:
| Plan | Daily Posts | Monthly Posts |
|------|-------------|---------------|
| **Starter** | 5 | 150 |
| **Pro** | 20 | 600 |
| **Enterprise** | 50 | 1,500 |

### Global Free Tier:
- **1,500 requests/day** shared across ALL tenants
- **100 Starter tenants** = 500 posts/day (33% of quota)
- **50 Pro tenants** = 1,000 posts/day (66% of quota)

### When to Upgrade to Paid:
- You exceed 1,500 posts/day regularly
- Cost: ~$0.001 per post (~$60/month for 2,000 posts/day)
- Upgrade at: https://makersuite.google.com/ (add credit card)

---

## 🎨 Frontend Integration

### Example: Admin Panel Toggle UI

```tsx
// web-app/src/app/[tenant]/admin/social/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

export default function SocialMediaSettings() {
  const [config, setConfig] = useState({
    twitter: { enabled: false },
    instagram: { enabled: false },
    facebook: { enabled: false },
    tiktok: { enabled: false },
  });

  const [usage, setUsage] = useState({ daily: 0, monthly: 0 });
  const [limits, setLimits] = useState({ daily: 5, monthly: 150 });

  useEffect(() => {
    // Load config
    fetch('/api/v1/social/config')
      .then(r => r.json())
      .then(data => setConfig(data.data));

    // Load usage
    fetch('/api/v1/social/usage')
      .then(r => r.json())
      .then(data => {
        setUsage(data.usage);
        setLimits(data.limits);
      });
  }, []);

  const toggle = async (platform: string, enabled: boolean) => {
    const updated = {
      ...config,
      [platform]: { ...config[platform], enabled },
    };
    setConfig(updated);

    await fetch('/api/v1/social/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  };

  const postWithAI = async (content: string, platforms: string[]) => {
    const res = await fetch('/api/v1/social/post-with-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, platforms }),
    });

    if (res.status === 429) {
      const data = await res.json();
      alert(`Daily limit reached! Upgrade to ${data.upgrade} plan for more posts.`);
    } else {
      const data = await res.json();
      console.log('Posted to:', data.results);
      setUsage(data.usage); // Update usage display
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Social Media Auto-Posting</h1>

      {/* Usage Display */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          Daily: {usage.daily} / {limits.daily} posts
        </p>
        <p className="text-sm text-gray-600">
          Monthly: {usage.monthly} / {limits.monthly} posts
        </p>
      </div>

      {/* Platform Toggles */}
      <div className="space-y-4">
        <PlatformToggle
          name="Twitter / X"
          enabled={config.twitter.enabled}
          onToggle={(e) => toggle('twitter', e)}
        />
        <PlatformToggle
          name="Instagram"
          enabled={config.instagram.enabled}
          onToggle={(e) => toggle('instagram', e)}
        />
        <PlatformToggle
          name="Facebook"
          enabled={config.facebook.enabled}
          onToggle={(e) => toggle('facebook', e)}
        />
        <PlatformToggle
          name="TikTok"
          enabled={config.tiktok.enabled}
          onToggle={(e) => toggle('tiktok', e)}
        />
      </div>

      {/* Test Post */}
      <button
        onClick={() => postWithAI('Test post!', ['twitter'])}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test AI Posting
      </button>
    </div>
  );
}

function PlatformToggle({ name, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded">
      <span className="font-medium">{name}</span>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
```

---

## 🧪 Testing

### 1. Test Usage Limits
```bash
# Make 6 posts quickly (Starter plan allows 5)
for i in {1..6}; do
  curl -X POST https://your-worker.workers.dev/api/v1/social/post-with-ai \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d "{\"content\": \"Test post $i\", \"platforms\": [\"twitter\"]}"
done

# 6th post should return 429 error
```

### 2. Test AI Formatting
```bash
# Send a simple post, check formatted output in logs
curl -X POST https://your-worker.workers.dev/api/v1/social/post-with-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Amazing game today!",
    "platforms": ["twitter", "instagram", "facebook"]
  }'

# Check worker logs to see AI-formatted versions
npx wrangler tail
```

---

## 💡 How It Works

### 1. User Creates Post
- Admin creates post in web app or mobile app
- Selects platforms (Twitter, Instagram, etc.)
- Clicks "Post"

### 2. Usage Check
- Backend checks tenant's plan (Starter/Pro/Enterprise)
- Verifies daily and monthly usage limits
- Returns 429 error if limit exceeded

### 3. AI Formatting
- Gemini AI receives original content
- Formats for each platform's style:
  - **Twitter**: Short, casual, hashtags
  - **Instagram**: Engaging, emojis, 5-10 hashtags
  - **Facebook**: Detailed, family-friendly
  - **TikTok**: Energetic, trending style

### 4. Platform Posting
- Currently logs formatted content (mock)
- TODO: Implement actual API posting per platform
- Returns success/failure per platform

### 5. Usage Increment
- Increments daily counter (expires after 24 hours)
- Increments monthly counter (expires after 60 days)
- Returns updated usage to frontend

---

## 🔧 Configuration

### Adjust Usage Limits
Edit `backend/src/services/socialAgent.ts`:
```typescript
export const SOCIAL_LIMITS: Record<string, PlanLimits> = {
  starter: { daily: 5, monthly: 150 },      // Change these
  pro: { daily: 20, monthly: 600 },         // values
  enterprise: { daily: 50, monthly: 1500 }, // as needed
};
```

### Switch AI Model
Edit `backend/src/services/socialAgent.ts`:
```typescript
this.model = this.genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp', // or 'gemini-pro', 'gemini-1.5-flash'
});
```

---

## 📈 Monitoring

### Check Usage
```bash
# View usage for a tenant
curl https://your-worker.workers.dev/api/v1/social/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "success": true,
  "usage": { "daily": 3, "monthly": 45 },
  "limits": { "daily": 5, "monthly": 150 },
  "plan": "starter"
}
```

### View Logs
```bash
# Real-time logs
npx wrangler tail

# Search for social agent logs
npx wrangler tail | grep "SOCIAL AGENT"
```

---

## 🚨 Troubleshooting

### Error: "GEMINI_API_KEY is not defined"
- Solution: Add secret via `wrangler secret put GEMINI_API_KEY`

### Error: "Daily limit reached"
- Solution: Upgrade tenant plan or wait until next day
- Usage resets at midnight UTC

### Error: "No enabled platforms selected"
- Solution: Enable at least one platform in social config

### AI formatting is poor
- Solution: Upgrade to paid Gemini tier for better model
- Or switch to Claude/OpenAI (requires code changes)

---

## 💰 Cost Breakdown

### Free Tier (Current Setup)
- **Cost**: $0/month
- **Capacity**: 1,500 posts/day (all tenants combined)
- **Best for**: 0-50 tenants

### Paid Tier (When Needed)
- **Cost**: ~$60/month for 2,000 posts/day
- **Capacity**: 1,000,000 posts/day
- **Best for**: 50+ tenants
- **Upgrade at**: https://makersuite.google.com/

---

## 🎯 Next Steps

1. ✅ Get Gemini API key (done above)
2. ✅ Add to Cloudflare secrets (done above)
3. ✅ Deploy backend (done above)
4. 🔲 Build admin UI for platform toggles
5. 🔲 Implement actual social media posting (OAuth)
6. 🔲 Add scheduling feature
7. 🔲 Monitor usage and upgrade when needed

---

## 📚 Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **Free API Key**: https://makersuite.google.com/app/apikey
- **Pricing**: https://ai.google.dev/pricing
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/quota

---

**Questions?** Check the logs with `npx wrangler tail` or post in the issues! 🚀
