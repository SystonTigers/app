# Syston Tigers Mobile App

React Native mobile app for Syston Tigers FC and multi-tenant football clubs.

## 🚀 Quick Start

### Run on Your Phone (Easiest!)

1. **Download Expo Go** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Start the dev server**:
   ```bash
   npm start
   ```

3. **Scan the QR code** with your phone:
   - iOS: Use Camera app
   - Android: Use Expo Go app

App will load on your phone instantly! No build needed.

---

## 📱 Features (Current)

### ✅ Home Screen
- **Next Event Widget** (top)
  - Shows upcoming match/training/social event
  - RSVP buttons (Attending / Can't Make It)
  - Event details (date, time, location)

- **News Feed** (scrollable below)
  - Team posts
  - Channel indicators (App/X/Instagram/Facebook)
  - Like/comment/share actions
  - Pull to refresh

### 🎨 Design
- **Syston Tigers colors**: Yellow (#FFD700) & Black
- **Material Design 3** (React Native Paper)
- **Mock data** (API integration coming next)

---

## 🔧 Tech Stack

- **Framework**: React Native (Expo)
- **UI Library**: React Native Paper
- **Navigation**: React Navigation (coming soon)
- **State**: Zustand (coming soon)
- **API**: Axios

---

## 📁 Project Structure

```
syston-mobile/
├── src/
│   ├── config.ts           # API URL, colors, constants
│   └── screens/
│       └── HomeScreen.tsx  # Main home screen
├── App.tsx                 # App entry point
└── package.json
```

---

## 🛠️ Development

### Install Dependencies
```bash
npm install
```

### Start Dev Server
```bash
npm start
```

### Run on Simulator/Emulator
```bash
npm run ios      # iOS simulator (Mac only)
npm run android  # Android emulator
npm run web      # Web browser
```

### Clear Cache
```bash
npm start --clear
```

---

## 📋 Next Steps

### Week 1-2 (Current Sprint)
- [x] Project setup
- [x] Home screen with next event widget
- [x] News feed UI
- [ ] Connect to backend API
- [ ] Add navigation (bottom tabs)
- [ ] Add authentication

### Week 3-4
- [ ] Calendar screen
- [ ] Event RSVP functionality
- [ ] .ics export

### Week 5-6
- [ ] Fixtures & results
- [ ] Squad & player profiles
- [ ] Gallery

---

## 🔗 Backend

**API Base URL**: https://syston-postbus.team-platform-2025.workers.dev
**Tenant ID**: syston-tigers

See `src/config.ts` to change.

---

## 📚 Documentation

- [Expo Docs](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [React Navigation](https://reactnavigation.org/)

---

## 🐛 Troubleshooting

**App won't load on phone:**
- Make sure phone and computer are on same WiFi
- Try restarting dev server: `npm start --clear`

**Build errors:**
- Delete node_modules: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start --clear`

**Can't scan QR code:**
- Try manual connection: In Expo Go, tap "Enter URL manually"
- Type the URL shown in terminal (e.g., `exp://192.168.1.5:8081`)

---

Built with ❤️ for Syston Tigers FC
