# Deploy Legal Documents to Cloudflare Pages

## Quick Deploy (2 commands)

```bash
# 1. Navigate to legal-docs folder
cd c:\dev\app-FRESH\legal-docs

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy . --project-name=fielddrop-legal
```

That's it! Your legal docs will be live at:
- `https://fielddrop-legal.pages.dev/privacy.html`
- `https://fielddrop-legal.pages.dev/terms.html`

---

## Setup Custom Domain (Optional)

If you have `fielddrop.app` domain:

1. **In Cloudflare Dashboard:**
   - Go to Pages → fielddrop-legal → Custom domains
   - Click "Add a domain"
   - Enter: `legal.fielddrop.app`
   - Cloudflare will auto-configure DNS

2. **Your final URLs:**
   - `https://legal.fielddrop.app/privacy.html`
   - `https://legal.fielddrop.app/terms.html`

---

## Update app.json

After deployment, update your mobile app.json:

```json
{
  "expo": {
    ...
    "extra": {
      "eas": { "projectId": "dev-placeholder" },
      "privacyPolicyUrl": "https://legal.fielddrop.app/privacy.html",
      "termsOfServiceUrl": "https://legal.fielddrop.app/terms.html"
    }
  }
}
```

Or if using pages.dev:
```json
"privacyPolicyUrl": "https://fielddrop-legal.pages.dev/privacy.html",
"termsOfServiceUrl": "https:// fielddrop-legal.pages.dev/terms.html"
```

---

## Troubleshooting

### "wrangler not found"
```bash
npm install -g wrangler
```

### "Authentication required"
```bash
npx wrangler login
```

### Want to use GitHub instead?
See `LEGAL_HOSTING_GUIDE.md` for GitHub Pages instructions.

---

## Files Deployed

- ✅ `index.html` - Landing page
- ✅ `privacy.html` - Privacy Policy
- ✅ `terms.html` - Terms of Service

All files are styled, mobile-responsive, and ready for production!
