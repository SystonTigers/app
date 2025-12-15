# Apps Script Manual Deployment Guide

## Issue

`clasp push` is failing with permission error. This usually means the Google account authenticated with clasp doesn't have edit access to the Apps Script project.

## Option 1: Fix clasp Authentication (Recommended)

```bash
# Logout and login with the correct Google account
clasp logout
clasp login

# Then try pushing again
cd "C:\Users\clayt\OneDrive\Desktop\New Final Products\Final Products\OA App\applatest"
clasp push
```

## Option 2: Manual Upload via Apps Script Editor

If clasp still doesn't work, manually upload the new config files:

### Step 1: Open Apps Script Editor

1. Go to https://script.google.com
2. Find your project (Script ID: `1x4MvHn9BTvlKQmUi2KcQuNdkPck5FeECBkiaKol7oy0VKcfHsneBNjA-`)
   - Or search for it in your recent scripts

### Step 2: Create config Folder

In the Apps Script editor:
1. Click the "+" next to "Files"
2. Click "Script"
3. Name it `config/tenant`
4. Repeat for all config files

### Step 3: Copy File Contents

Copy the contents from your local files to the editor:

**config/tenant.gs**
- Local: `C:\Users\clayt\OneDrive\Desktop\New Final Products\Final Products\OA App\applatest\apps-script\config\tenant.gs`
- Copy entire file contents to Apps Script editor

**config/features.gs**
- Local: `...\apps-script\config\features.gs`
- Copy entire file contents

**config/api.gs**
- Local: `...\apps-script\config\api.gs`
- Copy entire file contents

**config/youtube.gs**
- Local: `...\apps-script\config\youtube.gs`
- Copy entire file contents

**config/webhooks.gs**
- Local: `...\apps-script\config\webhooks.gs`
- Copy entire file contents

**config/index.gs**
- Local: `...\apps-script\config\index.gs`
- Copy entire file contents

### Step 4: Update config.gs

**config.gs**
- Local: `...\apps-script\config.gs`
- The deprecation notice has already been added to the top
- Just verify it's there when you look at the file in the editor

### Step 5: Save and Test

1. Click "Save" (💾) in the Apps Script editor
2. Run `validateEnvironment()` from config/index.gs to test
3. Check the execution log for any errors

## Option 3: Use Different Script

If the script belongs to a different account and you can't access it:

```bash
# Create a new Apps Script project
clasp create --title "OA App Config Test" --type standalone

# This will create a new .clasp.json with a new script ID
# Then push the new config files to the new project
clasp push
```

## Files Created

The following config files are ready in your local directory:

```
apps-script/
├── config/
│   ├── tenant.gs          ✅ Created
│   ├── features.gs        ✅ Created
│   ├── api.gs             ✅ Created
│   ├── youtube.gs         ✅ Created
│   ├── webhooks.gs        ✅ Created
│   └── index.gs           ✅ Created
├── config.gs              ✅ Updated with deprecation notice
└── CONFIG_MIGRATION_GUIDE.md ✅ Created
```

## What to Do Next

1. **Try Option 1** (fix clasp auth) - fastest if it works
2. If that fails, **use Option 2** (manual upload) - guaranteed to work
3. After files are uploaded, test with `validateEnvironment()`
4. Follow the migration guide to update your code over the next 2 weeks

## Need Help?

The config files are all in your local directory and ready to use. The content is correct - it's just a matter of getting them uploaded to the Apps Script project.
