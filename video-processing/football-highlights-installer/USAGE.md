# Football Highlights System - Usage Guide

## 🚀 Installation

### Method 1: NPM (Recommended)
```bash
npx create-football-highlights
```

### Method 2: Clone and Run
```bash
git clone https://github.com/football-highlights/installer.git
cd installer
npm install
npm start
```

### Method 3: Test First
```bash
# Test the installer without installing
npx create-football-highlights --test
# or
node bin/test-install.js
```

## 📋 What Happens During Installation

### 1. System Check (30 seconds)
- ✅ Verifies Node.js version (18+ required)
- ✅ Checks internet connectivity
- ✅ Validates system permissions

### 2. Configuration (2 minutes)
```
✅ Club name: Your Football Club
✅ Season: 2024-25
✅ Region: Europe (or US East/West, Asia-Pacific)
✅ Email: admin@yourclub.com
✅ Video quality: Balanced (Fast/Balanced/High)
```

### 3. Account Setup (10-15 minutes)
The installer opens browser tabs and guides you through:

**GitHub (Free)**
- Create account or sign in
- Automatic repository creation
- Device flow authentication (no passwords needed)

**Railway (Free - 500 hours/month)**
- Sign up with GitHub
- Get API token from dashboard
- Automatic project creation and deployment

**Render (Free - 750 hours/month)**
- Create account
- Generate API key
- Backup service deployment

**Cloudflare (Free - 100K requests/month)**
- Sign up for account
- Create custom API token
- Worker deployment for coordination

**Google Services (Free - 15GB storage)**
- OAuth authentication
- Enable required APIs (Drive, YouTube, Sheets, Apps Script)
- Create project and credentials

### 4. Infrastructure Deployment (5-10 minutes)
- 🚂 Railway: Primary video processing service
- 🎨 Render: Backup processing service
- ☁️ Cloudflare: Coordination and load balancing
- 📊 Google Sheet: Management interface
- 📝 Apps Script: Automation triggers

### 5. System Verification (3-5 minutes)
Runs 15 comprehensive tests:
- Account authentication
- Service health checks
- Communication between services
- File operations
- Performance baseline

## 🎥 After Installation

### Your New System Includes:

**Management Spreadsheet**
```
📊 Dashboard    → System overview and health
📋 Live Match   → Real-time event tracking
👥 Players      → Squad management
📅 Matches      → Match history and results
🎬 Video Queue  → Processing status and links
⚙️ Settings     → Configuration options
📋 System Logs  → Troubleshooting info
```

**Video Processing Pipeline**
```
📱 Record Match → 📤 Upload to Drive → 📝 Add to Queue
                                        ↓
📺 YouTube Upload ← 🎬 Create Clips ← ⚡ Auto Process
                                        ↓
📱 Share Links ← 📁 Store in Drive ← 🔄 Multi-Format
```

**Processing Endpoints**
- Primary: `https://your-club-highlights-12345.up.railway.app`
- Backup: `https://your-club-highlights-backup.onrender.com`
- Control: `https://your-club-coordinator.workers.dev`

## 📱 Daily Usage

### During Matches
1. Open your management spreadsheet
2. Go to "Live Match" tab
3. Add events as they happen:
   ```
   Minute: 23
   Event: Goal
   Player: John Smith
   Score: 1-0
   ```
4. System automatically:
   - Updates player statistics
   - Queues video clips for processing
   - Logs everything with timestamps

### After Matches
1. Upload match video to Google Drive
2. Add video filename to "Video Queue" tab
3. System automatically:
   - Downloads and processes video
   - Creates clips for each event (30 seconds each)
   - Generates 3 formats: 16:9, 1:1, 9:16
   - Uploads to Drive and YouTube
   - Updates queue with download links

### Getting Your Content
Check "Video Queue" tab for results:
```
📱 Instagram Stories: 9:16 vertical format
📘 Facebook Posts: 16:9 landscape format
📷 Instagram Feed: 1:1 square format
📺 YouTube: 16:9 with automatic playlists
```

## 🎬 Video Formats Explained

### 16:9 Landscape (Master)
- **Resolution**: 1920×1080 (Full HD)
- **Best for**: YouTube, Facebook, Twitter
- **Features**: Full field view, professional graphics

### 1:1 Square
- **Resolution**: 1080×1080
- **Best for**: Instagram feed, Facebook posts
- **Features**: Centered action, smart cropping

### 9:16 Vertical (Portrait)
- **Resolution**: 1080×1920
- **Best for**: TikTok, Instagram Stories, YouTube Shorts
- **Features**: Player-focused framing, mobile-optimized

## 📊 System Capacity

### Free Tier Limits
| Service | Monthly Limit | Typical Usage |
|---------|---------------|---------------|
| Railway | 500 hours | ~50 hours (10x safety margin) |
| Render | 750 hours | ~30 hours (25x safety margin) |
| Cloudflare | 100K requests | ~5K requests (20x safety margin) |
| Google Drive | 15GB | ~2GB videos (7x safety margin) |

**Bottom line**: 9,000+ videos per month capacity, completely free.

## 🔧 Maintenance

### Weekly
- Check "System Logs" tab for any errors
- Clear old test files from Google Drive
- Review "Dashboard" for system health

### Monthly
- Export important data as backup
- Check service usage vs. limits
- Update player roster if needed
- Clean up old video files

### As Needed
- Re-run installer if services go down
- Update Apps Script triggers if needed
- Check for system updates

## 🆘 Troubleshooting

### Installation Issues

**"Node.js not found"**
```bash
# Download and install Node.js 18+
# https://nodejs.org/
node --version  # Should show v18+
```

**"GitHub authentication failed"**
1. Check email is verified
2. Try incognito/private browser mode
3. Disable popup blockers temporarily

**"Railway deployment failed"**
1. Check account limits (500 hours/month)
2. Delete old unused projects
3. Verify GitHub integration working

**"Google permissions denied"**
1. Grant ALL requested permissions
2. Clear Google cookies and try again
3. Use different Google account if needed

### Runtime Issues

**Video processing stuck**
1. Check "Video Queue" tab for status
2. Verify video file accessible in Drive
3. Check "System Logs" for error details
4. Try smaller video file first (< 1GB)

**Sheet not updating**
1. Check Apps Script triggers active
2. Verify all permissions granted
3. Try manual refresh (Ctrl+F5)
4. Check "System Logs" tab

**Services not responding**
1. Check service URLs in browser
2. Look at "Dashboard" system health
3. Try re-running installer
4. Contact support if persistent

### Performance Issues

**Processing too slow**
- Check internet upload/download speed
- Try "Fast Processing" quality setting
- Process smaller video files
- Avoid peak hours (evenings)

**Sheet operations timing out**
- Reduce number of simultaneous users
- Clear browser cache
- Use incognito mode
- Try different device

## 💡 Pro Tips

### Optimize Your Workflow
1. **Prepare player list** before first match
2. **Use mobile device** for live tracking during games
3. **Batch upload videos** after matches
4. **Set up keyboard shortcuts** for common events

### Video Quality Tips
1. **Upload highest quality** you have available
2. **Good lighting** improves automatic detection
3. **Stable camera** works best with tracking
4. **Clear audio** helps event detection

### Social Media Best Practices
1. **16:9 for YouTube**: Complete match highlights
2. **1:1 for Instagram**: Individual goal posts
3. **9:16 for Stories**: Quick behind-the-scenes clips
4. **Mix formats**: Keep content varied across platforms

## 🚀 Advanced Usage

### API Access
Your system includes REST API endpoints:

```bash
# Process video programmatically
curl -X POST https://your-coordinator.workers.dev/coordinate \
  -H "Content-Type: application/json" \
  -d '{"video":"match.mp4","events":[...],"priority":"high"}'

# Check service health
curl https://your-railway-app.railway.app/health

# Get processing status
curl https://your-coordinator.workers.dev/status?id=queue-item-id
```

### Custom Event Types
Add your own event types in Settings tab:
- "Great Save"
- "Skill Move"
- "Team Goal"
- "Counter Attack"
- "Free Kick"

### Bulk Processing
Process multiple matches at once:
1. Upload all videos to Google Drive
2. Add multiple entries to Video Queue
3. System processes in order automatically

### Integration with Other Tools
- **OBS Studio**: Stream directly to YouTube
- **Discord Bots**: Auto-post clips to Discord server
- **Website Integration**: Embed videos automatically
- **Analytics Tools**: Track engagement metrics

## 📞 Getting Help

### Self-Service
1. **System Logs**: Check "System Logs" tab first
2. **Dashboard**: Look for red indicators
3. **Re-run Installer**: Often fixes authentication issues
4. **Documentation**: Complete guides included

### Community Support
- **Discord**: Join our community server
- **GitHub**: Search existing issues
- **Email**: support@footballhighlights.com

### Reporting Issues
When contacting support, include:
1. **Error message** from System Logs
2. **Browser and version** you're using
3. **Steps to reproduce** the issue
4. **Screenshots** if helpful

## 🎉 Success Tips

### Week 1: Getting Started
- [ ] Complete installation
- [ ] Add all your players
- [ ] Process one test match
- [ ] Share your first highlight

### Week 2: Optimization
- [ ] Set up Apps Script triggers
- [ ] Create social media posting schedule
- [ ] Optimize video quality settings
- [ ] Train other club members

### Month 1: Full Automation
- [ ] Process full match highlights
- [ ] Automate social media posting
- [ ] Set up regular backups
- [ ] Monitor system performance

### Beyond: Scale Up
- [ ] Add more event types
- [ ] Create custom graphics
- [ ] Integrate with club website
- [ ] Share system with other clubs

---

## 🚀 Ready to Transform Your Club?

```bash
npx create-football-highlights
```

**Installation time**: 10 minutes
**Monthly cost**: £0 forever
**Impact**: Professional content, 10x faster

*Join thousands of clubs already using automated highlights!*