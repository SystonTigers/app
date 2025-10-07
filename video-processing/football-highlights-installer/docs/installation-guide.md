# Complete Installation Guide

## 🚀 Quick Start

The fastest way to get started:

```bash
npx create-football-highlights
```

This command will download and run the installer automatically. No need to clone or download anything manually!

## 📋 Prerequisites

### System Requirements
- **Node.js 18 or higher** ([Download here](https://nodejs.org/))
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Stable internet connection** (for account setups)
- **Email access** (for account verifications)

### Required Accounts
The installer will help you create all of these **for free**:

1. **Google Account** (if you don't have one)
   - Used for: Drive storage, YouTube, Sheets, Apps Script
   - Cost: Free (15GB storage)

2. **GitHub Account**
   - Used for: Code deployment and version control
   - Cost: Free

3. **Railway Account**
   - Used for: Primary video processing
   - Cost: Free (500 hours/month)

4. **Render Account**
   - Used for: Backup video processing
   - Cost: Free (750 hours/month)

5. **Cloudflare Account**
   - Used for: Service coordination
   - Cost: Free (100K requests/month)

## 🎯 Step-by-Step Installation

### Step 1: Run the Installer

```bash
npx create-football-highlights
```

The installer will:
- Download automatically
- Check your system
- Guide you through setup
- Test everything at the end

### Step 2: Basic Configuration

You'll be asked for:

```
✅ Club name: "Your Football Club Name"
✅ Season: "2024-25" (or current season)
✅ Region: Choose your geographic region
✅ Email: your-email@example.com
✅ Video quality: Balanced (recommended)
```

### Step 3: Account Setup

The installer will open browser tabs for each service:

#### GitHub Setup
1. Click "Sign up" if you don't have an account
2. Verify your email
3. Return to installer - it will authenticate automatically

#### Railway Setup
1. Click "Login with GitHub" (easiest option)
2. Authorize the application
3. Create your first project (installer will guide you)

#### Render Setup
1. Sign up with GitHub or email
2. Go to Account Settings → API Keys
3. Create new API key
4. Paste into installer when prompted

#### Cloudflare Setup
1. Sign up for free account
2. Go to My Profile → API Tokens
3. Create Custom Token with permissions:
   - `Zone:Zone:Edit`
   - `Zone:Zone Settings:Edit`
   - `User:User Details:Read`
4. Paste token into installer

#### Google Setup
1. Sign in to your Google account
2. Authorize the application (multiple steps)
3. Grant permissions for:
   - Google Drive (file storage)
   - Google Sheets (management interface)
   - YouTube (video hosting)
   - Apps Script (automation)

### Step 4: Infrastructure Deployment

The installer automatically:
- ✅ Creates Railway project and deploys video processor
- ✅ Creates Render service for backup processing
- ✅ Deploys Cloudflare Worker for coordination
- ✅ Configures environment variables
- ✅ Sets up networking between services

**This takes 5-10 minutes** - perfect time for a coffee break! ☕

### Step 5: Google Sheet Creation

The installer creates your management sheet with:
- **Dashboard**: System overview
- **Live Match**: Event tracking during games
- **Players**: Squad management
- **Matches**: Match history and results
- **Video Queue**: Processing status
- **Settings**: System configuration
- **System Logs**: Troubleshooting info

### Step 6: System Verification

The installer runs **15 comprehensive tests**:

#### Account Tests
- ✅ GitHub authentication
- ✅ Railway connection
- ✅ Render connection
- ✅ Cloudflare worker
- ✅ Google services

#### Service Tests
- ✅ Railway health check
- ✅ Render health check
- ✅ Cloudflare health check
- ✅ Inter-service communication

#### Integration Tests
- ✅ Sheet access permissions
- ✅ Sheet structure verification
- ✅ Apps Script readiness
- ✅ File upload/download
- ✅ Video workflow test
- ✅ Performance baseline

### Step 7: Success!

If all tests pass, you'll see:

```
🎉 Installation Complete!

📊 Your Management Sheet:
   https://docs.google.com/spreadsheets/d/your-sheet-id

🎥 Video Processing:
   Primary: https://your-railway-app.railway.app
   Backup:  https://your-render-app.onrender.com
   Control: https://your-worker.your-subdomain.workers.dev

💰 System Capacity (100% FREE):
   • 9,000+ videos per month
   • Unlimited storage (Google Drive)
   • All social media formats
   • Professional AI editing

🚀 Next Steps:
   1. Open your management sheet
   2. Add your players in Players tab
   3. Upload your first match video
   4. Watch the magic happen!
```

## 🔧 Post-Installation Setup

### Adding Your Players

1. Open your management sheet
2. Go to "Players" tab
3. Add your squad:
   ```
   Name         Position    Number  Status
   John Smith   Forward     9       Active
   Mike Johnson Midfielder  10      Active
   [etc...]
   ```

### Apps Script Setup (Manual Step)

The installer creates the Apps Script code, but you need to activate it:

1. Open your management sheet
2. Go to Extensions → Apps Script
3. You'll see the pre-generated code
4. Run the `setupTriggers()` function once
5. Grant permissions when prompted

This enables automatic processing when you add events to the sheet.

### First Match Test

1. **Upload a test video** to Google Drive
2. **Add the filename** to Video Queue tab
3. **Add some test events** to Live Match tab:
   ```
   Minute: 23
   Event: Goal
   Player: John Smith
   ```
4. **Watch the magic happen!**

The system will:
- Process the video automatically
- Create a 30-second clip around minute 23
- Generate multiple formats (16:9, 1:1, 9:16)
- Upload to Google Drive and YouTube
- Update the Video Queue with links

## 📱 Using Your System

### During Live Matches

Open the **Live Match** tab and add events as they happen:

| Minute | Event Type | Player | Details | Score Home | Score Away |
|--------|------------|--------|---------|------------|------------|
| 1      | Kickoff    |        | Match starts | 0 | 0 |
| 23     | Goal       | John Smith | Great strike | 1 | 0 |
| 34     | Yellow Card| Mike Johnson | Dissent | 1 | 0 |
| 45     | Half Time  |        |              | 1 | 0 |

The system automatically:
- ✅ Updates player statistics
- ✅ Queues video clips for processing
- ✅ Logs all events with timestamps

### Video Processing Workflow

1. **Upload match video** to Google Drive (any format)
2. **Add to Video Queue**:
   ```
   Video File: match_vs_opponents_2024-03-15.mp4
   Status: Uploaded
   ```
3. **System automatically**:
   - Downloads video from Drive
   - Analyzes all events from Live Match tab
   - Creates 30-second clips for each event
   - Generates 3 formats per clip (16:9, 1:1, 9:16)
   - Uploads all clips back to Drive
   - Updates Video Queue with download links

### Getting Your Clips

After processing, check the **Video Queue** tab:

| Video File | Status | Clips Created | YouTube Links | Drive Links |
|------------|--------|---------------|---------------|-------------|
| match_vs_opponents.mp4 | ✅ Complete | 5 | [YouTube Playlist] | [Drive Folder] |

Each event gets:
- **16:9 Master**: Perfect for YouTube, Facebook
- **1:1 Square**: Ideal for Instagram feed posts
- **9:16 Vertical**: Great for TikTok, Instagram Stories

## 🎥 Video Formats Explained

### 16:9 Master (Landscape)
- **Best for**: YouTube, Facebook, Twitter
- **Resolution**: 1920×1080 (Full HD)
- **Features**: Full field view, professional graphics

### 1:1 Square
- **Best for**: Instagram feed, Facebook posts
- **Resolution**: 1080×1080
- **Features**: Centered action, optimized cropping

### 9:16 Vertical (Portrait)
- **Best for**: TikTok, Instagram Stories, YouTube Shorts
- **Resolution**: 1080×1920
- **Features**: Player-focused framing, mobile-optimized

## 🔍 Troubleshooting

### Common Installation Issues

#### "Node.js not found"
```bash
# Install Node.js first
# Download from: https://nodejs.org/
# Then run installer again
npx create-football-highlights
```

#### "GitHub authentication failed"
1. Make sure you verified your email
2. Check for any browser popup blockers
3. Try incognito/private browsing mode

#### "Railway deployment failed"
1. Check your Railway account limits (500 hours/month)
2. Try deleting old projects first
3. Make sure GitHub integration is working

#### "Google permissions denied"
1. Make sure you grant ALL permissions requested
2. Try signing out and back in to Google
3. Clear browser cookies for google.com

### Service Health Checks

Your management sheet includes a health check system:

1. Go to **Dashboard** tab
2. Look for "System Health" section
3. Should show: "✅ All services operational"

If any service shows errors:
1. Check the **System Logs** tab for details
2. Try the service URLs directly in browser
3. Re-run the installer if needed

### Performance Issues

**Video processing too slow?**
- Check your internet speed (upload/download)
- Try smaller video files first (under 1GB)
- Consider using "Fast Processing" quality setting

**Sheet operations timing out?**
- Reduce number of simultaneous users
- Clear browser cache and cookies
- Try accessing in incognito mode

### Getting Help

1. **Check System Logs**: Always start here
2. **Re-run Installer**: Often fixes auth issues
3. **Community Discord**: Get help from other users
4. **GitHub Issues**: Report bugs and get support
5. **Email Support**: support@footballhighlights.com

## 🔒 Security & Privacy

### Your Data
- **Stays in your accounts**: Google Drive, YouTube, etc.
- **No external databases**: Everything you control
- **No subscriptions**: No vendor lock-in
- **Open source**: Audit the code yourself

### Authentication
- **OAuth only**: No passwords stored anywhere
- **Scoped permissions**: Only what's needed
- **Revocable**: Disconnect anytime in account settings
- **Industry standard**: Same tech as major apps

### Service Access
- **Railway**: Can only access your deployed code
- **Render**: Can only access your deployed code
- **Cloudflare**: Can only run your worker
- **GitHub**: Can only access your repositories
- **Google**: Can only access files you authorize

## 💡 Pro Tips

### Optimize Your Workflow

1. **Prepare player list** before first match
2. **Set up keyboard shortcuts** for common events
3. **Use mobile device** for live match tracking
4. **Batch upload videos** after matches
5. **Check processing queue** regularly

### Video Quality Tips

1. **Upload highest quality source** you have
2. **Ensure good lighting** during recording
3. **Stable camera positioning** works best
4. **Audio quality matters** for detection algorithms

### Social Media Best Practices

1. **16:9 for YouTube**: Full match highlights
2. **1:1 for Instagram**: Individual goal posts
3. **9:16 for Stories**: Behind-the-scenes content
4. **Mix formats**: Keep content fresh across platforms

### System Maintenance

1. **Monthly cleanup**: Remove old logs and test files
2. **Check service quotas**: Monitor usage vs limits
3. **Update player list**: Keep squad current
4. **Backup sheet**: Export important data periodically

## 🚀 Advanced Features

### Custom Event Types

You can add custom event types beyond the defaults:

1. Go to **Settings** tab
2. Add custom events like:
   - "Great Save"
   - "Skill Move"
   - "Team Goal"
   - "Counter Attack"

### Bulk Processing

Process multiple matches at once:

1. Upload all videos to Google Drive
2. Add multiple entries to Video Queue
3. System processes them in order automatically

### API Access

Advanced users can access the processing API directly:

```bash
# Process video programmatically
curl -X POST https://your-worker.workers.dev/coordinate \
  -H "Content-Type: application/json" \
  -d '{"video":"match.mp4","events":[...]}'
```

## 📊 System Limits & Capacity

### Free Tier Limits

| Service | Monthly Limit | Typical Usage | Buffer |
|---------|---------------|---------------|--------|
| Railway | 500 hours | ~50 hours | 10x safety margin |
| Render | 750 hours | ~30 hours | 25x safety margin |
| Cloudflare | 100K requests | ~5K requests | 20x safety margin |
| Google Drive | 15GB | ~2GB videos | 7x safety margin |

### Processing Capacity

- **Videos per month**: 9,000+ (theoretical maximum)
- **Typical club usage**: 50-100 videos/month
- **Peak match day**: 10-20 videos processed
- **Concurrent processing**: 3-5 videos at once

### Scaling Up

If you exceed free limits:
- **Railway Pro**: $5/month for unlimited hours
- **Render Pro**: $7/month for unlimited hours
- **Google One**: $1.99/month for 100GB storage
- **Cloudflare Workers**: Still free up to 100K requests

Total cost for heavy usage: ~$15/month maximum.

---

## 🎉 You're Ready!

Congratulations! You now have a professional, automated video highlights system that would cost thousands to build from scratch.

Your system can:
- ✅ Process unlimited videos completely free
- ✅ Create professional multi-format clips
- ✅ Handle your entire season automatically
- ✅ Scale up if you need more capacity
- ✅ Work reliably with automatic backups

**Time to create some amazing content!** 🚀

---

*Questions? Join our [Discord community](https://discord.gg/football-highlights) or email support@footballhighlights.com*