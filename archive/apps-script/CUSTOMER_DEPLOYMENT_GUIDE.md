# 🏈 Football Highlights - Customer Deployment Guide

## Overview

This system allows football clubs to automatically process match videos, generate highlights, and track player statistics - **all without any code modifications required!**

## ✨ Key Benefits

- **Zero Code Editing**: All configuration happens through Google Sheets
- **Automatic Setup**: Guided wizard walks you through everything
- **User-Friendly**: Familiar spreadsheet interface for all settings
- **Professional Features**: Video processing, AI highlights, storage management
- **Support Ready**: Built-in diagnostics and support information generation

## 📋 Prerequisites

Before starting, ensure you have:

1. **Google Account** with access to Google Sheets and Google Apps Script
2. **Google Drive Folder** for video storage (we'll help you create this)
3. **Deployed Backend Service** (Railway/Render URL and API key)
4. **Email Address** for notifications (optional but recommended)

## 🚀 Quick Start (5-Minute Setup)

### Step 1: Copy the Apps Script Code

1. Open [Google Apps Script](https://script.google.com)
2. Create a new project: "Football Highlights System"
3. Delete the default `Code.gs` content
4. Copy and paste each of these files into separate script files:

**Required Files:**
- `config-sheet-template.gs` - Configuration sheet management
- `sheet-config-reader.gs` - Dynamic configuration reader
- `modernized-code.gs` - Main system functions
- `setup-wizard.gs` - Customer setup wizard
- `customer-integration.gs` - Customer interface and menu

### Step 2: Create Your Spreadsheet

1. Create a new Google Sheets document
2. Name it: "Football Highlights - [Your Club Name]"
3. In Google Apps Script, go to **Resources > Libraries**
4. Link your script to the spreadsheet:
   - Click the "Container" dropdown
   - Select "Spreadsheet"
   - Choose your newly created spreadsheet

### Step 3: Run the Setup Wizard

1. Open your Google Sheets document
2. Look for the "🏈 Football Highlights" menu (refresh if not visible)
3. Click **"🚀 Start Setup"**
4. Follow the guided wizard (takes 5-10 minutes)

The wizard will:
- ✅ Create all necessary sheets
- ✅ Guide you through configuration
- ✅ Test your connections
- ✅ Set up notifications

### Step 4: Start Processing Videos!

1. Add videos to the **Video Queue** sheet
2. Fill in match details in **Match Notes**
3. Click **"🎬 Process Video Queue"** from the menu
4. Check the **Dashboard** for status updates

## 📊 System Sheets Overview

Once set up, your spreadsheet will contain:

### 🔧 Config
**Your control center** - All system settings in one place:
- API connections (Railway/Render URLs)
- Club information (name, season, league)
- Google services (Drive folder, YouTube channel)
- Email notifications
- Advanced settings

### 🎬 Video Queue
**Video processing management**:
- Add videos for processing
- Track processing status
- View results and errors
- Manage processing queue

### 📝 Match Notes
**Match information and context**:
- Match details (date, opposition, score)
- Key events and timestamps
- Player performance notes
- Custom annotations

### 📊 Dashboard
**System overview and health**:
- Configuration status
- Processing statistics
- System health indicators
- Quick access to key functions

### 📋 Activity Log
**System activity tracking**:
- Processing history
- System events
- Error messages
- Configuration changes

### 💾 Storage Info
**Storage monitoring**:
- Google Drive usage
- File cleanup status
- Storage alerts
- Retention policies

## ⚙️ Configuration Guide

### Essential Settings (Required)

**Club Information:**
- **Club Name**: Your football club's name
- **Season**: Current season (e.g., "2024-25")
- **Region**: Your league or region

**API Connection:**
- **Railway URL**: Your deployed service URL
- **API Key**: Authentication key for your service

**Google Services:**
- **Drive Folder ID**: Google Drive folder for video storage
- **Notification Email**: Email for system alerts

### Optional Settings

**Advanced:**
- **Max Concurrent Jobs**: Number of simultaneous video processing (1-5)
- **File Retention**: How long to keep processed files (7-365 days)
- **Debug Mode**: Enable detailed logging for troubleshooting

**Notifications:**
- **Notification Level**: How many alerts to receive
- **YouTube Channel**: For automatic uploads (optional)

## 🔗 Google Drive Setup

### Creating Your Storage Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a new folder: "Football Highlights 2024"
3. Right-click the folder → **Share**
4. Copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   ```
   The ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

5. Paste this ID into the **Config** sheet

### Folder Structure

The system will automatically organize your videos:
```
Football Highlights 2024/
├── 2024-25/
│   ├── Match vs Team A - 2024-03-15/
│   │   ├── full-match.mp4
│   │   ├── highlights.mp4
│   │   └── player-clips/
│   └── Match vs Team B - 2024-03-22/
└── processed/
    └── archived-files/
```

## 🎯 Usage Workflows

### Processing a New Match Video

1. **Add to Queue:**
   - Open **Video Queue** sheet
   - Add new row with:
     - Video ID (unique identifier)
     - Match name
     - Video URL (YouTube, Google Drive, or direct link)
     - Notes/instructions

2. **Add Match Context:**
   - Open **Match Notes** sheet
   - Add match details:
     - Date, opposition, score
     - Key events and timings
     - Player performance notes

3. **Process Video:**
   - Menu: **🎬 Process Video Queue**
   - System will automatically:
     - Download and analyze video
     - Generate highlights
     - Create player clips
     - Upload to Google Drive
     - Send notification when complete

4. **Review Results:**
   - Check **Dashboard** for completion status
   - View processed files in Google Drive
   - Review any error messages

### Monitoring System Health

- **Dashboard**: Overall system status and statistics
- **Activity Log**: Detailed system events and processing history
- **Storage Info**: Drive usage and cleanup status
- **Menu → Check System Status**: Quick configuration validation

## 🔧 Troubleshooting

### Common Issues

**"Configuration Required" Message:**
- Check **Config** sheet for missing settings
- Run **Menu → Check System Status** for details
- Ensure all required fields are filled

**Video Processing Fails:**
- Verify Railway/Render URL is correct and service is running
- Check API key is properly set
- Ensure video URL is accessible
- Review **Activity Log** for specific error messages

**Google Drive Access Issues:**
- Verify Drive Folder ID is correct
- Ensure folder is shared with your Google account
- Check folder permissions allow file creation

**Email Notifications Not Working:**
- Verify email address in Config sheet
- Check email notifications are enabled
- Ensure Gmail allows Apps Script emails

### Getting Help

1. **System Diagnostic:**
   - Menu: **🔍 Run System Diagnostic**
   - Comprehensive health check with detailed report

2. **Support Information:**
   - Menu: **📋 Generate Support Info**
   - Creates detailed support report (no sensitive data)
   - Share with technical support if needed

3. **Reset Configuration:**
   - Menu: **Advanced → ⚠️ Reset Configuration**
   - Completely resets system (preserves video queue)
   - Use only if system is corrupted

## 📧 Notification Settings

### Notification Levels

**Minimal:**
- Only critical errors
- Video processing completions
- Storage critical alerts

**Normal (Recommended):**
- Processing status updates
- System health alerts
- Configuration warnings
- Weekly summaries

**Verbose:**
- All system events
- Detailed processing logs
- Performance metrics
- Debug information

### Email Templates

The system sends professional notifications:

```
Subject: [Your Club] Video Processing Complete

Your match video has been successfully processed!

Match: vs Opposition Team
Date: March 15, 2024
Processing Time: 8 minutes 32 seconds

Generated Content:
✓ Full match highlights (3:45)
✓ Individual player clips (12)
✓ Key moments compilation (1:52)

View files: [Google Drive Link]

---
Football Highlights System
```

## 🔐 Security and Privacy

### Data Protection

- **No Sensitive Data in Code**: All configuration in sheets
- **Encrypted Communications**: HTTPS for all API calls
- **Limited Access**: System only accesses your designated folders
- **Audit Trail**: All actions logged in Activity Log

### API Security

- **Authentication Required**: All API calls use your private key
- **Secure Storage**: API keys stored in Google's secure properties
- **Access Control**: Only your spreadsheet can access your processing service

### Google Services

- **Drive Permissions**: Limited to your specified folder
- **Email Access**: Only for sending notifications to your configured email
- **Sheets Access**: Only reads/writes your football highlights spreadsheet

## 📈 Advanced Features

### Custom Processing Settings

Configure in **Config** sheet:
- **Max Concurrent Jobs**: Balance speed vs resource usage
- **File Retention**: Automatic cleanup of old files
- **Quality Settings**: Video processing quality preferences

### Integration Options

- **Make.com Webhooks**: Automate social media posting
- **YouTube Upload**: Automatic highlight uploads
- **Team Management**: Multiple user access controls

### Analytics and Reporting

- **Dashboard Metrics**: Processing statistics and performance
- **Player Analytics**: Individual player highlight tracking
- **Season Summaries**: Automatic end-of-season reports

## 🆘 Support and Community

### Documentation
- **This Guide**: Complete deployment and usage instructions
- **Video Tutorials**: Available on request
- **FAQ**: Common questions and solutions

### Getting Help
- **System Diagnostic**: Built-in troubleshooting
- **Support Reports**: Automated support information generation
- **Community Forums**: User community and tips

### Updates and Maintenance
- **Automatic Updates**: System checks for script updates
- **Backward Compatibility**: New features don't break existing setups
- **Migration Tools**: Easy upgrade paths for new versions

---

## 🎉 Congratulations!

You now have a complete, professional video processing system that requires zero code modifications. The system will grow with your club's needs and provides enterprise-level features through a simple spreadsheet interface.

**Next Steps:**
1. Process your first video
2. Explore the dashboard and analytics
3. Set up automated workflows
4. Invite team members to use the system

**Need Help?** Use the built-in diagnostic tools or generate a support report from the menu.

---

*This system represents a complete shift from code-based configuration to user-friendly, sheet-based management. Every aspect can be controlled through the familiar Google Sheets interface.*