# App Icons & Splash Screens Guide

Complete guide for creating and configuring app icons, splash screens, and other visual assets for the Syston Tigers mobile app.

---

## 📋 Table of Contents

1. [Asset Requirements](#asset-requirements)
2. [Quick Setup with Expo](#quick-setup-with-expo)
3. [Manual Asset Creation](#manual-asset-creation)
4. [Asset Specifications](#asset-specifications)
5. [Testing Your Assets](#testing-your-assets)
6. [Troubleshooting](#troubleshooting)

---

## 🎨 Asset Requirements

### Required Assets

Your app needs the following assets in the `assets/` folder:

| Asset | Size | Format | Purpose |
|-------|------|--------|---------|
| `icon.png` | 1024x1024px | PNG | App icon (iOS & Android) |
| `adaptive-icon.png` | 1024x1024px | PNG | Android adaptive icon foreground |
| `splash-icon.png` | 1284x2778px | PNG | Splash screen image |
| `favicon.png` | 48x48px | PNG | Web browser favicon |
| `notification-icon.png` | 96x96px | PNG | Android notification icon |

### Optional Assets

| Asset | Purpose |
|-------|---------|
| `notification-sound.wav` | Custom notification sound |

---

## ⚡ Quick Setup with Expo

The **fastest way** to generate all required assets is using Expo's automatic asset generation:

### Step 1: Create Your Source Icon

Create a **single 1024x1024px PNG** with your Syston Tigers logo:

**Design Tips:**
- Use Syston Tigers yellow (#FFD700) as primary color
- Include the tiger logo or team badge
- Keep important elements in the center (safe zone: 800x800px)
- Use transparent background OR solid color
- Export as high-quality PNG

**Quick Design Tools:**
- [Canva](https://www.canva.com/) - Free, easy drag-and-drop
- [Figma](https://www.figma.com/) - Professional design tool
- Photoshop / Illustrator - If you have them

### Step 2: Use Expo Icon Generator

```bash
# Navigate to mobile folder
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\mobile"

# Install Expo CLI (if not already installed)
npm install -g expo-cli

# Generate all icon sizes automatically
npx expo-generate-icon --icon ./path/to/your-source-icon.png

# Generate splash screen
npx expo-generate-splash --splash ./path/to/your-splash-source.png
```

This automatically creates:
- ✅ `assets/icon.png` (1024x1024)
- ✅ `assets/adaptive-icon.png` (1024x1024)
- ✅ `assets/favicon.png` (48x48)
- ✅ All platform-specific sizes

### Step 3: Verify Configuration

Your `app.json` is already configured! Just verify these paths exist:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "backgroundColor": "#FFD700"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFD700"
      }
    }
  }
}
```

✅ **Done!** Your assets are ready.

---

## 🛠️ Manual Asset Creation

If you want full control, create assets manually:

### 1. App Icon (`icon.png`)

**Specifications:**
- Size: 1024x1024px
- Format: PNG with transparency OR solid background
- Color: Use Syston Tigers colors (#FFD700 yellow, #000000 black)
- Safe zone: Keep logo/text in center 800x800px area

**Design Guidelines:**
```
┌─────────────────────────────┐
│                             │
│   ┌───────────────────┐     │
│   │                   │     │  <- 112px margin all sides
│   │   Syston Tigers   │     │
│   │    Tiger Logo     │     │  <- Your content here (800x800)
│   │                   │     │
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
    1024x1024px total
```

**Tools:**
- [AppIconMaker](https://appiconmaker.co/) - Generate all sizes from one image
- [MakeAppIcon](https://makeappicon.com/) - Free icon generator

### 2. Adaptive Icon (`adaptive-icon.png`)

**Android Adaptive Icons:**
- Size: 1024x1024px
- Must be **foreground layer only** (no background)
- Use transparent PNG
- Safe zone: 640x640px center circle

**Why?** Android uses adaptive icons that can be masked into different shapes (circle, square, squircle) depending on device manufacturer.

**Visual Guide:**
```
┌─────────────────────────────┐
│          Mask Zone          │  <- May be cut off
│   ┌───────────────────┐     │
│   │   ╱───────────╲   │     │
│   │  │ Safe Zone  │  │     │  <- Keep logo here
│   │   ╲───────────╱   │     │  (640px diameter circle)
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```

**Background Color:** Set in `app.json` (currently `#FFD700`)

### 3. Splash Screen (`splash-icon.png`)

**Specifications:**
- Size: 1284x2778px (iPhone 14 Pro Max resolution)
- Format: PNG
- Background: Set in app.json (`backgroundColor: "#FFD700"`)
- Logo/Image: Centered, max 400x400px recommended

**Design:**
```
┌───────────────┐
│               │
│               │
│               │
│   ┌─────┐     │  <- Your logo (400x400)
│   │ 🏆  │     │     centered vertically
│   └─────┘     │
│               │
│               │
│               │
└───────────────┘
  1284x2778px
```

**Expo will automatically:**
- Scale for different devices
- Apply background color
- Center your logo/image

### 4. Notification Icon (`notification-icon.png`)

**Android Only:**
- Size: 96x96px
- Format: PNG with transparency
- Style: **White silhouette** on transparent background
- Must be simple/flat (no gradients, no colors)

**Example:**
```
Simple tiger head silhouette in white
Background: Transparent
Android will apply notification color (#FFD700) automatically
```

**Tools:**
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-notification.html)

---

## 📐 Asset Specifications

### iOS

| Asset Type | Size | Purpose |
|------------|------|---------|
| App Icon | 1024x1024 | App Store & home screen |
| Splash | 1284x2778 | Launch screen (scaled) |

**iOS automatically generates:**
- 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt sizes
- 1x, 2x, 3x resolutions
- Rounded corners (13.3% radius)

### Android

| Asset Type | Size | Purpose |
|------------|------|---------|
| Adaptive Icon (Foreground) | 1024x1024 | App icon foreground |
| Adaptive Icon (Background) | Color in config | App icon background |
| Notification Icon | 96x96 | Status bar notifications |
| Splash | 1284x2778 | Launch screen (scaled) |

**Android automatically generates:**
- mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi densities
- Masked shapes (circle, square, squircle, rounded square)

### Web

| Asset Type | Size | Purpose |
|------------|------|---------|
| Favicon | 48x48 | Browser tab icon |

---

## 🎨 Design Best Practices

### Colors

Use Syston Tigers brand colors (from `src/config.ts`):

```typescript
COLORS = {
  primary: '#FFD700',      // Syston Yellow (gold)
  secondary: '#000000',    // Black
  accent: '#FFA500',       // Orange
}
```

### Logo Design

**DO:**
- ✅ Keep it simple and recognizable at small sizes
- ✅ Use high contrast colors
- ✅ Center important elements
- ✅ Test at multiple sizes (32px, 64px, 128px)
- ✅ Use consistent branding

**DON'T:**
- ❌ Use tiny text (won't be readable)
- ❌ Use too many colors or gradients
- ❌ Place important elements near edges
- ❌ Use low-resolution images

### Splash Screen

**Good Splash Screens:**
- Simple, clean design
- Quick to load (< 500KB)
- Centered logo on solid color
- No animations (Expo doesn't support animated splash)
- Matches app's visual style

**Example Design:**
```
Background: Syston Yellow (#FFD700)
Center: Black tiger logo (300x300px)
Optional: "Syston Tigers" text below logo
```

---

## 🧪 Testing Your Assets

### 1. Test in Expo Go

```bash
# Start development server
npm start

# Scan QR code with Expo Go app
# Check that splash screen shows your logo
# Check that app icon appears correctly
```

### 2. Test Local Build (Android)

```bash
# Build APK for testing
eas build --platform android --profile preview

# Download APK from Expo dashboard
# Install on Android device
# Check:
#   - App icon on home screen
#   - Notification icon (send test notification)
#   - Splash screen on app launch
```

### 3. Test Local Build (iOS)

```bash
# Build for iOS simulator (Mac only)
eas build --platform ios --profile development

# Install on simulator
# Check:
#   - App icon on home screen
#   - Splash screen on app launch
```

### 4. Validate Assets

Use online validators:
- **iOS:** [App Icon Validator](https://www.appicon.build/)
- **Android:** [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

---

## 🚀 Build & Deploy

### Production Builds

When ready for App Store / Google Play:

```bash
# iOS Production Build
eas build --platform ios --profile production

# Android Production Build
eas build --platform android --profile production
```

**EAS Build automatically:**
- ✅ Generates all platform-specific icon sizes
- ✅ Applies splash screen configuration
- ✅ Validates asset dimensions
- ✅ Optimizes file sizes

### Update Assets After Build

If you update icons/splash after building:

```bash
# Update app.json with new asset paths
# Rebuild app
eas build --platform all --profile production
```

---

## ❓ Troubleshooting

### "Icon not showing in Expo Go"

**Problem:** Splash screen or icon doesn't update in Expo Go app.

**Solution:**
1. Close Expo Go completely
2. Clear Expo Go cache (Settings → Clear Cache)
3. Restart development server with cache clear:
   ```bash
   npm start --clear
   ```
4. Reopen app in Expo Go

### "Splash screen is stretched/distorted"

**Problem:** Splash image aspect ratio doesn't match `resizeMode` setting.

**Solution:**
- Use `"resizeMode": "contain"` to fit image within screen (current setting)
- OR use `"resizeMode": "cover"` to fill entire screen (may crop image)
- OR adjust splash image size to match target device aspect ratio

### "Android adaptive icon looks wrong"

**Problem:** Logo is cut off or positioned incorrectly.

**Solution:**
1. Ensure logo is centered in 640x640px safe zone
2. Test with different mask shapes:
   ```bash
   # Preview adaptive icon masks
   # Use Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/
   ```
3. Adjust foreground image accordingly

### "Notification icon is colorful instead of white"

**Problem:** Android notification icons must be white silhouettes.

**Solution:**
1. Open `notification-icon.png` in image editor
2. Remove all colors (keep only white on transparent)
3. Simplify shapes (no gradients)
4. Save and rebuild

### "Asset file not found"

**Problem:** Build fails with "Cannot find asset at path..."

**Solution:**
1. Check file paths in `app.json` match actual file names
2. Verify files exist in `assets/` folder:
   ```bash
   ls assets/
   # Should show: icon.png, adaptive-icon.png, splash-icon.png, etc.
   ```
3. Check file name spelling (case-sensitive on some systems)

---

## 📚 Resources

### Design Tools (Free)
- [Canva](https://www.canva.com/) - Easy graphic design
- [Figma](https://www.figma.com/) - Professional design
- [GIMP](https://www.gimp.org/) - Free Photoshop alternative

### Asset Generators
- [AppIcon Generator](https://appicon.co/) - All platform icons
- [MakeAppIcon](https://makeappicon.com/) - Free icon generator
- [App Icon Resizer](https://resizeappicon.com/) - Resize to all sizes

### Validators
- [App Icon Validator](https://www.appicon.build/) - iOS icons
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) - Android icons

### Documentation
- [Expo App Icons](https://docs.expo.dev/develop/user-interface/app-icons/)
- [Expo Splash Screens](https://docs.expo.dev/develop/user-interface/splash-screen/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Icon Design](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)

---

## ✅ Checklist

Before building for production:

- [ ] Created 1024x1024px app icon
- [ ] Created 1024x1024px adaptive icon (Android)
- [ ] Created splash screen image
- [ ] Created notification icon (96x96 white silhouette)
- [ ] Tested in Expo Go
- [ ] Built preview APK and tested on Android device
- [ ] Built preview IPA and tested on iOS device (if applicable)
- [ ] Validated all assets with online tools
- [ ] Updated `app.json` with correct asset paths
- [ ] Confirmed splash screen background color matches brand
- [ ] Tested notification icon appearance

---

## 🎯 Next Steps

After setting up assets:

1. **Test thoroughly** in Expo Go and preview builds
2. **Build for production** when assets are finalized
3. **Submit to App Store / Google Play** (see EAS Submit documentation)
4. **Update assets for seasons/events** (e.g., special Christmas icon)

---

**Need Help?**

- Expo Documentation: https://docs.expo.dev/
- Expo Forums: https://forums.expo.dev/
- GitHub Issues: https://github.com/SystonTigers/app/issues

---

**Last Updated:** 2025-10-11
**App Version:** 1.0.0
**Expo SDK:** Latest (check `app.json`)
