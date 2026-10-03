# 📱 Create GitHub Repository for syston-mobile

## Option 1: Via GitHub Web UI (Easiest)

1. Go to: https://github.com/new
2. Fill in:
   - **Owner**: SystonTigers
   - **Repository name**: `syston-mobile`
   - **Description**: `React Native mobile app for Syston Tigers FC - multi-tenant grassroots football platform`
   - **Visibility**: Public
   - **Initialize**: ❌ DO NOT check "Add README" or "Add .gitignore" (we already have these)

3. Click "Create repository"

4. In your terminal (on this machine), run:
   ```bash
   cd ~/syston-mobile
   git remote add origin https://github.com/SystonTigers/syston-mobile.git
   git branch -M main
   git push -u origin main
   ```

## Option 2: Via API (Automated)

If you have a GitHub personal access token, run:

```bash
curl -X POST https://api.github.com/orgs/SystonTigers/repos \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{
    "name": "syston-mobile",
    "description": "React Native mobile app for Syston Tigers FC - multi-tenant grassroots football platform",
    "private": false
  }'

# Then add remote and push
cd ~/syston-mobile
git remote add origin https://github.com/SystonTigers/syston-mobile.git
git branch -M main
git push -u origin main
```

---

## ✅ Already Prepared

Your local repo is ready with:
- ✅ All files committed
- ✅ .gitignore configured
- ✅ 11 files including all screens, API layer, config
- ✅ Commit message with proper attribution

Just create the GitHub repo and push!
