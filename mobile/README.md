# Syston Tigers Mobile App

React Native mobile app for Syston Tigers FC and multi-tenant football clubs.

## 🚀 Quick Start

### Run on Your Phone (Easiest!)

1. **Download Expo Go** on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Start the dev server**:
   ```bash
   cd mobile
   npm start
   ```

3. **Scan the QR code** with your phone:
   - iOS: Use Camera app
   - Android: Use Expo Go app
   - Or open: http://localhost:8081 in browser

App will load on your phone instantly! No build needed.

---

## 📱 Features (5 Tabs)

### ✅ 1. Home Screen
- **Next Event Widget** (top)
  - Shows upcoming match/training/social event
  - RSVP buttons (Attending / Can't Make It)
  - Event details (date, time, location)

- **News Feed** (scrollable below)
  - Team posts
  - Channel indicators (App/X/Instagram/Facebook)
  - Like/comment/share actions
  - Pull to refresh

### ✅ 2. Calendar Screen
- **Visual Calendar** with event markers
- Color-coded event types:
  - 🔴 Matches
  - 🟢 Training
  - 🟡 Social events
- **Tap date** to see event details
- **RSVP System**: Going / Maybe / Can't Go
- **Export .ics** for native calendar
- **Upcoming events list** below calendar

### ✅ 3. Fixtures Screen
- **Upcoming Fixtures**
  - Date, time, venue
  - Competition badges
  - Home/away indicator

- **Recent Results**
  - Scores displayed
  - Scorers listed
  - Yellow/red cards shown

### ✅ 4. Squad Screen
- **Player Cards** with avatars (initials)
- **Player Stats**:
  - Goals, assists, appearances
  - Yellow/red cards
- **Position Badges** (color-coded):
  - 🟡 Goalkeeper
  - 🔵 Defender
  - 🟢 Midfielder
  - 🔴 Forward
- Tap player for full profile

### ✅ 5. Videos Screen (NEW!)
- **📹 Record Video** directly in app
- **📁 Select Video** from phone library
- **🤖 AI-Powered Processing**:
  - Upload full match video
  - AI automatically detects highlights
  - Creates professional clips
  - Auto-posts to social media
- **Recent Highlights** with status tracking
- **Video Preview** with controls
- **Pro Tips** for best quality

---

## 🎬 Video System (Two Modes)

### Mode 1: Mobile App (In-App Editing)
**For**: Parents, players, quick clips

```
Record/Select → Preview → Upload → AI Processing → Done!
```

- Record directly in app (5 min max)
- Select from phone library
- Preview before upload
- Upload to server for AI processing
- Get notified when clips ready

### Mode 2: Server-Side (Full Match Processing)
**For**: Coaches, full match automation

```
Upload Full Match → AI Detection → Auto-Edit → YouTube → Social Media
```

- Upload full 90-minute match
- AI detects goals, cards, key moments
- Automatically creates highlight clips
- Posts to YouTube + social media
- Fully automated workflow

**Both modes use the same AI processing backend!**

---

## 🎨 Design

- **Syston Tigers colors**: Yellow (#FFD700) & Black
- **Material Design 3** (React Native Paper)
- **Bottom Tab Navigation** (5 tabs)
- **Mock data** (ready for API connection)

---

## 🔧 Tech Stack

### Frontend
- **Framework**: React Native (Expo)
- **UI Library**: React Native Paper (Material Design 3)
- **Navigation**: React Navigation (bottom tabs)
- **State**: Zustand
- **API**: Axios
- **Video**: expo-av, expo-image-picker, expo-video-thumbnails
- **Calendar**: react-native-calendars
- **Notifications**: expo-notifications
- **Location**: expo-location (for geo-fencing)

### Backend (Server-Side Video Processing)
- **Python AI Bot**: highlights_bot (AI detection + editing)
- **Docker Processor**: football-highlights-processor (production scaling)
- **Apps Script**: Metadata tracking + YouTube upload
- See `../video-processing/README.md` for details

---

## 📁 Project Structure

```
mobile/
├── src/
│   ├── config.ts                 # API URL, colors, constants
│   ├── services/
│   │   └── api.ts                # API client (axios)
│   └── screens/
│       ├── HomeScreen.tsx        # Next event + news feed
│       ├── CalendarScreen.tsx    # Events + RSVP
│       ├── FixturesScreen.tsx    # Matches + results
│       ├── SquadScreen.tsx       # Squad roster
│       └── VideoScreen.tsx       # Video recording/upload
├── App.tsx                        # Navigation + theme
├── package.json
└── README.md                      # This file
```

---

## 🛠️ Development

### Install Dependencies
```bash
cd mobile
npm install
```

### Install Video Dependencies (if needed)
```bash
npx expo install expo-av expo-image-picker expo-video-thumbnails expo-media-library
```

### Start Dev Server
```bash
npm start
```

Options:
- Press `i` - Open iOS simulator
- Press `a` - Open Android emulator
- Press `w` - Open in web browser
- Press `r` - Reload app
- Press `m` - Toggle menu
- Press `c` - Clear cache

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

## 🔗 Backend Connection

### API Configuration
**File**: `src/config.ts`

```typescript
export const API_BASE_URL = 'https://syston-postbus.team-platform-2025.workers.dev';
export const TENANT_ID = 'syston-tigers';
```

### Connect to Deployed Backend
1. Deploy backend workers (see `../backend/README.md`)
2. Update `API_BASE_URL` with your worker URL
3. Restart app - data loads automatically!

### API Endpoints Used
```
GET  /api/v1/feed           # News feed
GET  /api/v1/events         # Calendar events
POST /api/v1/events/:id/rsvp # RSVP to event
GET  /api/v1/fixtures       # Upcoming matches
GET  /api/v1/results        # Past results
GET  /api/v1/squad          # Squad list
POST /api/v1/videos/upload  # Upload video (NEW)
```

---

## 📋 Current Status

### ✅ Completed
- [x] Project setup (Expo + TypeScript)
- [x] 5 main screens built
- [x] Bottom tab navigation
- [x] API integration layer
- [x] Mock data for development
- [x] Video recording/upload UI
- [x] Material Design 3 theme
- [x] Syston Tigers branding

### 🚧 In Progress
- [ ] Connect to backend API
- [ ] Add authentication (login screen)
- [ ] Replace mock data with real data

### ⏳ Planned
- [ ] Push notifications (geo-aware)
- [ ] Gallery screen
- [ ] Chat/messaging
- [ ] Training tools (coaches)
- [ ] Team store (Printify)

---

## 🎬 Video Features Setup

### Permissions Required
The app will request:
- **Camera** - For recording videos
- **Media Library** - For selecting videos

Users will see permission prompts on first use.

### Video Upload Flow

```
1. USER ACTION
   ├─> Record Video (5 min max)
   └─> OR Select from Library

2. PREVIEW
   ├─> Play/pause controls
   ├─> Trim option (coming soon)
   └─> Cancel/Upload buttons

3. UPLOAD
   ├─> Upload to server
   ├─> Show progress
   └─> Notify when processing starts

4. SERVER PROCESSING (Automatic)
   ├─> AI detects highlights
   ├─> Creates clips
   ├─> Uploads to YouTube
   └─> Posts to social media

5. NOTIFICATION
   └─> "Your highlights are ready!"
```

### Video Limits
- **Max recording time**: 5 minutes (in-app)
- **Max file size**: Set by server (typically 2GB)
- **Formats supported**: MP4, MOV, AVI
- **Processing time**: 5-15 minutes depending on length

---

## 🐛 Troubleshooting

### App won't load on phone
- Make sure phone and computer are on same WiFi
- Try restarting dev server: `npm start --clear`
- Check firewall isn't blocking port 8081

### Build errors
- Delete node_modules: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start --clear`
- Update Expo: `npm install expo@latest`

### Can't scan QR code
- Try manual connection: In Expo Go, tap "Enter URL manually"
- Type the URL shown in terminal (e.g., `exp://192.168.1.5:8081`)
- Or open http://localhost:8081 in browser

### Video recording not working
- Check camera permissions in phone settings
- Restart Expo Go app
- Some emulators don't support camera (use real device)

### Video upload fails
- Check backend is running
- Verify API_BASE_URL in config.ts
- Check file size isn't too large
- Ensure network connection

---

## 📚 Documentation

### Expo & React Native
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [React Navigation](https://reactnavigation.org/)

### Video Libraries
- [expo-av](https://docs.expo.dev/versions/latest/sdk/av/) - Video playback/recording
- [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) - Select videos
- [expo-video-thumbnails](https://docs.expo.dev/versions/latest/sdk/video-thumbnails/) - Generate thumbnails

### System Docs
- `../CLAUDE.md` - Complete system overview
- `../video-processing/README.md` - Video processing details
- `../PRODUCT_ROADMAP.md` - Feature timeline
- `../backend/README.md` - Backend API

---

## 🚀 Deployment

### Development (Current)
```bash
npx expo start
# Scan QR code with Expo Go app
```

### Preview Build (For Testing)
```bash
# iOS
eas build --profile preview --platform ios

# Android
eas build --profile preview --platform android
```

### Production Build
```bash
# Create Expo account first
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See [Expo EAS docs](https://docs.expo.dev/build/introduction/) for details.

---

## 🎯 Next Steps

### For Users
1. Download Expo Go on your phone
2. Scan QR code
3. Test all 5 tabs
4. Try recording a video!

### For Developers
1. Deploy backend workers (../backend)
2. Update API_BASE_URL in config.ts
3. Test with real data
4. Add authentication
5. Build preview version for testing

---

## 💡 Pro Tips

### Video Recording
- **Hold phone horizontally** for best quality
- **Ensure good lighting** for AI detection
- **Upload full matches** for automatic highlights
- **Record key moments** for quick clips

### App Performance
- Use "Clear cache" if app feels slow
- Restart dev server regularly
- Real device performs better than emulator

### Testing
- Test on both iOS and Android
- Try different screen sizes
- Test with slow network
- Test video upload with large files

---

Built with ❤️ for Syston Tigers FC

**Status**: Development (Mock Data)
**Next Milestone**: Deploy backend + connect real data
**Current Version**: v1.0.0-alpha
