# Expo Setup & Development Guide

## Problem: "Failed to download remote update"

If you see this error when scanning the QR code in Expo Go, it's because the Metro bundler URL is `exp://127.0.0.1:8082` (localhost), which your phone cannot reach.

### Solution: Use Tunnel Mode

Tunnel mode creates a public URL that your phone can access, bypassing network restrictions.

## Setup Instructions

### 1. Align Expo SDK Versions

First, ensure all Expo packages are using compatible versions:

```bash
cd mobile
npx expo install
```

This will automatically update:
- `expo@~54.0.20`
- `react-native@0.81.5`
- `@expo/vector-icons@^15.0.3`

### 2. Clear All Caches

```bash
# Clear Expo cache
npx expo start --clear

# Or manually clear caches
rm -rf .expo
rm -rf node_modules/.cache
```

**On your phone:**
- **Android:** Settings → Apps → Expo Go → Storage → Clear Cache + Clear Data
- **iOS:** Delete and reinstall Expo Go app

### 3. Start with Tunnel Mode

```bash
npx expo start --host tunnel
```

**OR** if Expo is already running:
1. Press `c` in the terminal
2. Select "Tunnel" from the connection type menu

### 4. Scan QR Code

The tunnel URL will look like: `exp://abc-123.anonymous.exp.direct:80`

1. Open Expo Go on your phone
2. Tap "Scan QR code"
3. Point camera at the QR code
4. App will download and launch!

## Alternative: LAN Mode

If you're on the same WiFi network and have firewall ports open:

```bash
npx expo start --host lan
```

**Required ports:**
- 8082 (Metro bundler)
- 19000 (Expo Dev Tools)
- 19001 (Expo secure endpoint)

**Windows Firewall:**
```powershell
# Allow Node.js through firewall
netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
```

## Troubleshooting

### QR Code Not Showing

- Open http://localhost:8081 in your browser to see the QR code
- Or press `s` in the terminal to switch connection modes

### "Uncaught Error: Failed to fetch"

Your phone can't reach the dev server. Use Tunnel mode instead of LAN.

### "Network request failed"

1. Check `EXPO_PUBLIC_API_BASE` in `.env`
2. Ensure backend is deployed and accessible
3. Try restarting Expo: `npx expo start -c --host tunnel`

### App Crashes on Launch

1. Ensure SDK versions are aligned (step 1)
2. Clear caches (step 2)
3. Rebuild: `npx expo start -c`

### Tunnel Takes Too Long

Tunnel mode can be slower than LAN. If you're on the same network:
1. Ensure both devices are on the same WiFi
2. Open firewall ports (see above)
3. Use LAN mode: `npx expo start --host lan`

## Development Workflow

### Daily Development

```bash
cd mobile
npx expo start --host tunnel
```

### After Installing New Packages

```bash
npx expo install
npx expo start -c --host tunnel
```

### Before Testing on Physical Device

1. Ensure Expo Go is updated (latest version from app store)
2. Clear Expo Go cache on phone
3. Start with `--clear` flag
4. Scan QR code

### Production Builds

For production builds (not development):

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Environment Variables

Ensure these are set in `.env`:

```env
EXPO_PUBLIC_API_BASE=https://your-backend.workers.dev
EXPO_PUBLIC_TENANT_ID=your-tenant-id
```

## Useful Commands

```bash
# Start with tunnel
npx expo start --host tunnel

# Start with clear cache
npx expo start -c

# Start on specific port
npx expo start --port 8081

# Show connection options
# Press 'c' in terminal

# Reload app on phone
# Press 'r' in terminal

# Open on Android emulator
# Press 'a' in terminal

# Open on iOS simulator (Mac only)
# Press 'i' in terminal
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Go App (iOS)](https://apps.apple.com/app/expo-go/id982107779)
- [Expo Go App (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Notes

- **Tunnel mode** is recommended for most development scenarios
- **LAN mode** is faster but requires same WiFi network
- **Localhost mode** only works on emulators/simulators
- Always use `--clear` flag after changing dependencies
- Update Expo Go app regularly to avoid compatibility issues
