# Privacy Policy & Terms Hosting Guide

## Quick Start

You need to host your Privacy Policy and Terms of Service documents at public URLs before submitting to app stores.

## Option 1: Host on Your Website (Recommended)

### If you have fielddrop.app or systontigers.co.uk:

1. **Convert Markdown to HTML:**
   ```bash
   # Install a markdown converter
   npm install -g marked
   
   # Convert files
   marked PRIVACY_POLICY.md > privacy.html
   marked TERMS_OF_SERVICE.md > terms.html
   ```

2. **Add to your website:**
   - Upload `privacy.html` to `https://fielddrop.app/privacy`
   - Upload `terms.html` to `https://fielddrop.app/terms`

3. **Style the pages** (optional but recommended):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Privacy Policy - Field Drop</title>
     <style>
       body {
         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         max-width: 800px;
         margin: 0 auto;
         padding: 20px;
         line-height: 1.6;
         color: #333;
       }
       h1 { color: #0B1220; }
       h2 { color: #1a365d; margin-top: 2em; }
       a { color: #3182ce; }
     </style>
   </head>
   <body>
     <!-- Your converted content here -->
   </body>
   </html>
   ```

4. **Update app.json:**
   ```json
   "extra": {
     "privacyPolicyUrl": "https://fielddrop.app/privacy",
     "termsOfServiceUrl": "https://fielddrop.app/terms"
   }
   ```

---

## Option 2: GitHub Pages (Free & Easy)

Perfect if you don't have a website yet.

### Steps:

1. **Create a new GitHub repository:**
   ```bash
   # In your project root
   mkdir legal-docs
   cd legal-docs
   git init
   ```

2. **Add index page:**
   ```bash
   # Create index.html
   cat > index.html << 'EOF'
   <!DOCTYPE html>
   <html>
   <head>
     <title>Field Drop - Legal Documents</title>
   </head>
   <body>
     <h1>Field Drop Legal Documents</h1>
     <ul>
       <li><a href="/privacy">Privacy Policy</a></li>
       <li><a href="/terms">Terms of Service</a></li>
     </ul>
   </body>
   </html>
   EOF
   ```

3. **Convert and add documents:**
   ```bash
   # Copy your MD files
   cp ../mobile/PRIVACY_POLICY.md .
   cp ../mobile/TERMS_OF_SERVICE.md .
   
   # Convert to HTML (or use GitHub's built-in renderer)
   # You can use a simple HTML template
   ```

4. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add legal documents"
   gh repo create fielddrop-legal --public --source=. --push
   ```

5. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main`
   - Save

6. **Your URLs will be:**
   - `https://[username].github.io/fielddrop-legal/privacy.html`
   - `https://[username].github.io/fielddrop-legal/terms.html`

---

## Option 3: Cloudflare Pages (Free)

Since your backend is on Cloudflare, this integrates nicely.

### Steps:

1. **Create a simple static site:**
   ```bash
   mkdir legal-docs
   cd legal-docs
   
   # Create HTML versions of your documents
   echo '<!DOCTYPE html><html><body>' > privacy.html
   cat ../mobile/PRIVACY_POLICY.md >> privacy.html
   echo '</body></html>' >> privacy.html
   ```

2. **Deploy to Cloudflare Pages:**
   ```bash
   wrangler pages project create legal-docs
   wrangler pages publish legal-docs
   ```

3. **Your URLs:**
   - `https://legal-docs.pages.dev/privacy.html`
   - Or set up custom domain: `https://legal.fielddrop.app/privacy`

---

## Option 4: Simple HTML Files (Quickest)

Use this online converter and host anywhere:

1. Go to: https://markdowntohtml.com/
2. Paste your PRIVACY_POLICY.md content
3. Click "Convert"
4. Save as `privacy.html`
5. Repeat for TERMS_OF_SERVICE.md
6. Upload to any web hosting

---

## What to Do AFTER Hosting

### 1. Update app.json

Add to the root level of `app.json`:
```json
{
  "expo": {
    ...
    "extra": {
      "eas": { "projectId": "dev-placeholder" },
      "privacyPolicyUrl": "https://fielddrop.app/privacy",
      "termsOfServiceUrl": "https://fielddrop.app/terms"
    }
  }
}
```

### 2. Add Links to Mobile App

Create a new component to show legal links in Settings:

```tsx
// mobile/src/components/LegalLinks.tsx
import React from 'react';
import { Linking } from 'react-native';
import { List } from 'react-native-paper';
import Constants from 'expo-constants';

export function LegalLinks() {
  const privacyUrl = Constants.expoConfig?.extra?.privacyPolicyUrl;
  const termsUrl = Constants.expoConfig?.extra?.termsOfServiceUrl;

  return (
    <>
      <List.Item
        title="Privacy Policy"
        left={props => <List.Icon {...props} icon="shield-check" />}
        right={props => <List.Icon {...props} icon="open-in-new" />}
        onPress={() => privacyUrl && Linking.openURL(privacyUrl)}
      />
      <List.Item
        title="Terms of Service"
        left={props => <List.Icon {...props} icon="file-document" />}
        right={props => <List.Icon {...props} icon="open-in-new" />}
        onPress={() => termsUrl && Linking.openURL(termsUrl)}
      />
    </>
  );
}
```

Add to SettingsScreen.tsx:
```tsx
import { LegalLinks } from '../components/LegalLinks';

// In your Settings screen render:
<Card style={styles.card}>
  <Card.Content>
    <Title>Legal</Title>
    <LegalLinks />
  </Card.Content>
</Card>
```

### 3. Register Bundle IDs

**Apple:**
1. Go to https://developer.apple.com/account/
2. Certificates, Identifiers & Profiles → Identifiers
3. Click "+" to add new
4. Choose "App IDs"
5. Bundle ID: `com.systontigers.fielddrop`
6. Enable capabilities you need (Push Notifications, etc.)

**Google:**
1. Go to https://play.google.com/console
2. Create new app
3. Package name: `com.systontigers.fielddrop`
4. Complete app details

### 4. Test the Links

Before submitting:
```bash
# Test that URLs are accessible
curl -I https://fielddrop.app/privacy
curl -I https://fielddrop.app/terms

# Should return 200 OK
```

---

## Checklist

- [ ] Privacy Policy converted to HTML
- [ ] Terms of Service converted to HTML
- [ ] Both documents hosted at public URLs
- [ ] URLs return 200 OK (not 404)
- [ ] URLs added to app.json
- [ ] LegalLinks component added to Settings
- [ ] Bundle IDs registered with Apple/Google
- [ ] Tested opening links from mobile app

---

## Need Help?

**Quick hosting options:**
- **Netlify Drop:** Drag & drop HTML files at https://app.netlify.com/drop
- **Vercel:** `npx vercel --prod` in your legal-docs folder
- **Firebase Hosting:** Free and fast

**Next Steps:**
After hosting is complete, move on to Issue #3: Account Deletion feature.
