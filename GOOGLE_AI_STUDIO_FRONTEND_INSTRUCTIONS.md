# 🎨 Google AI Studio Instructions - World-Class Mobile App Frontend

**Project**: Syston Tigers Multi-Tenant Grassroots Sports Platform
**Location**: C:\dev\app-FRESH
**Target**: Production-ready React Native mobile app with Expo
**Quality Standard**: World-class, professional, broadcast-quality

---

## 🎯 Mission Statement

Build a **world-class mobile application** for grassroots football clubs that rivals professional sports apps in quality, design, and user experience. The app should feel like a premium product used by Premier League clubs, but optimized for grassroots teams, parents, and players.

---

## 📋 Executive Requirements

### Overall Quality Standards
- **Visual Design**: Professional, modern, clean - comparable to Sky Sports, ESPN, or OneFootball apps
- **User Experience**: Intuitive, fast, delightful - no learning curve needed
- **Performance**: Instant loading, smooth animations, responsive interactions
- **Accessibility**: WCAG 2.1 AA compliant, readable, high contrast
- **Mobile-First**: Optimized for one-handed use, thumb-friendly zones
- **Brand Consistency**: Every screen follows the same design language
- **Error Handling**: Graceful degradation, helpful error messages, offline support

### Technical Excellence
- **React Native + Expo** (latest stable versions)
- **TypeScript** throughout (strict mode)
- **Component Library**: React Native Paper (Material Design 3)
- **Navigation**: React Navigation v6+ (smooth, native-feeling transitions)
- **State Management**: Zustand (lightweight, performant)
- **API Client**: Axios with interceptors and retry logic
- **Animations**: React Native Reanimated 3 (60fps buttery smooth)
- **Icons**: Material Community Icons
- **Offline Support**: React Query with cache persistence
- **Testing**: Jest + React Native Testing Library

---

## 🏗️ Architecture Overview

```
app-FRESH/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Buttons, Cards, Inputs, etc.
│   │   ├── overlays/        # Modals, Bottomsheets, Toasts
│   │   └── layouts/         # Screen layouts, wrappers
│   ├── screens/             # Main app screens
│   │   ├── Home/            # Feed + Next Event
│   │   ├── Calendar/        # Events + RSVP
│   │   ├── Fixtures/        # Matches + Results
│   │   ├── Squad/           # Team roster
│   │   ├── Videos/          # Record/upload/view
│   │   ├── Gallery/         # Photo albums
│   │   ├── Store/           # Team merchandise
│   │   ├── Settings/        # User preferences
│   │   └── Auth/            # Login/signup
│   ├── navigation/          # Navigation setup
│   ├── services/            # API clients
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand stores
│   ├── utils/               # Helper functions
│   ├── constants/           # Colors, sizes, config
│   ├── types/               # TypeScript types
│   └── assets/              # Images, fonts, videos
├── App.tsx                  # Root component
├── app.json                 # Expo config
├── package.json
└── tsconfig.json
```

---

## 🎨 Design System

### Color Palette (Syston Tigers - Customizable per Tenant)

```typescript
// src/constants/theme.ts

export const COLORS = {
  // Brand colors (customizable per tenant)
  primary: '#FFD700',        // Syston Yellow (Gold)
  primaryDark: '#FFA500',    // Darker gold
  primaryLight: '#FFED4E',   // Lighter gold

  secondary: '#000000',      // Black
  secondaryLight: '#1A1A1A', // Dark gray

  accent: '#FF6B35',         // Orange (for CTAs, highlights)

  // Semantic colors
  success: '#10B981',        // Green (Tailwind Emerald 500)
  warning: '#F59E0B',        // Amber
  error: '#EF4444',          // Red
  info: '#3B82F6',           // Blue

  // Neutrals (professional gray scale)
  background: '#FFFFFF',     // Pure white
  surface: '#F9FAFB',        // Gray 50
  surfaceVariant: '#F3F4F6', // Gray 100

  border: '#E5E7EB',         // Gray 200
  borderLight: '#F3F4F6',    // Gray 100

  text: '#111827',           // Gray 900
  textSecondary: '#6B7280',  // Gray 500
  textTertiary: '#9CA3AF',   // Gray 400
  textDisabled: '#D1D5DB',   // Gray 300

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Card shadows
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowHeavy: 'rgba(0, 0, 0, 0.2)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 999,
};

export const TYPOGRAPHY = {
  // Font families (System defaults for best performance)
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',

  // Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const ANIMATION = {
  // Durations (ms)
  fast: 150,
  normal: 250,
  slow: 350,

  // Easing
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};
```

### Component Design Principles

1. **Card-Based Layouts**: Everything is a card with proper spacing and shadows
2. **Consistent Padding**: 16px horizontal, 12-16px vertical
3. **Clear Hierarchy**: Titles (20-24px), subtitles (16px), body (14px), captions (12px)
4. **Generous Touch Targets**: Minimum 44x44px for all tappable elements
5. **Smooth Transitions**: 250ms for most animations, 150ms for micro-interactions
6. **Loading States**: Skeleton loaders, not spinners
7. **Empty States**: Helpful illustrations and CTAs, never blank screens
8. **Error States**: Friendly messages with retry actions

---

## 📱 Screen-by-Screen Specifications

### 1. Home Screen (Feed + Next Event)

**Purpose**: Primary landing screen - shows next event and scrollable news feed

**Layout**:
```
┌─────────────────────────────────────┐
│  [Header: Logo + Notifications]     │ ← 60px height, sticky
├─────────────────────────────────────┤
│  [Next Event Card]                  │ ← 180px height, hero card
│  ┌──────────────────────────────┐   │
│  │ ⚽ MATCH                      │   │
│  │ Saturday 3PM                  │   │
│  │ Syston vs Leicester Panthers │   │
│  │                               │   │
│  │ [Going] [Maybe] [Can't Go]   │   │ ← RSVP buttons
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  [Feed Posts] (Infinite Scroll)     │
│  ┌──────────────────────────────┐   │
│  │ [Avatar] John Smith          │   │ ← Post card
│  │          2 hours ago          │   │
│  │                               │   │
│  │ Great win today! 3-1 🎉     │   │
│  │ [Image if attached]          │   │
│  │                               │   │
│  │ ❤️ 12   💬 3   🔗 Share     │   │
│  └──────────────────────────────┘   │
│                                     │
│  [More posts...]                    │
│                                     │
└─────────────────────────────────────┘
│  [Bottom Tab Bar]                   │ ← 60px height, fixed
└─────────────────────────────────────┘
```

**Key Features**:
- **Next Event Card**:
  - Large, prominent card at top (yellow gradient background for Syston)
  - Event type icon (⚽ match, 🏃 training, 🎉 social)
  - Date/time in large, readable font (18px)
  - Opposition team name + badges
  - One-tap RSVP with immediate visual feedback
  - Countdown timer if event is within 24 hours
  - Tap card to see full event details

- **Feed Posts**:
  - Card-based design with 16px margin between posts
  - Author avatar (40px circle) + name + timestamp
  - Post content with smart truncation (expand to read more)
  - Image/video attachments with 16:9 aspect ratio
  - Like/comment/share actions with haptic feedback
  - Pull-to-refresh with smooth animation
  - Infinite scroll with skeleton loaders

- **Interactions**:
  - Pull down to refresh (shows spinner + "Refreshing...")
  - Tap post to see full details + comments
  - Tap like to increment (heart animates and turns red)
  - Tap comment to open comment sheet
  - Tap share to open share sheet (native)
  - Long press on post for more options (report, etc.)

**Component Breakdown**:
```typescript
// src/screens/Home/HomeScreen.tsx

import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { NextEventCard } from './components/NextEventCard';
import { FeedPost } from './components/FeedPost';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { useFeed } from '@/hooks/useFeed';
import { useNextEvent } from '@/hooks/useNextEvent';

export const HomeScreen = () => {
  const { posts, loading, refreshing, fetchPosts, refresh } = useFeed();
  const { event, loading: eventLoading } = useNextEvent();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {/* Next Event */}
      {eventLoading ? (
        <SkeletonLoader variant="nextEvent" />
      ) : event ? (
        <NextEventCard event={event} />
      ) : null}

      {/* Feed Posts */}
      <FeedList posts={posts} loading={loading} />
    </ScrollView>
  );
};
```

**Design Details**:
- **Next Event Card**:
  - Background: Linear gradient (primary color → primaryLight)
  - Shadow: Large shadow (elevation 6)
  - Border radius: 16px
  - Padding: 20px
  - RSVP buttons: Pill-shaped, 44px height, haptic on press

- **Feed Posts**:
  - Background: White
  - Shadow: Medium shadow (elevation 3)
  - Border radius: 12px
  - Padding: 16px
  - Avatar: 40px circle with border
  - Like button: Red heart animation (scale + opacity)

---

### 2. Calendar Screen (Events + RSVP)

**Purpose**: Visual calendar view with event dots, RSVP tracking, and event details

**Layout**:
```
┌─────────────────────────────────────┐
│  [Header: Calendar + Filter]        │
├─────────────────────────────────────┤
│  [Month View Calendar]              │ ← react-native-calendars
│  ┌─────────────────────────────┐    │
│  │  S  M  T  W  T  F  S        │    │
│  │              1⚽ 2  3🏃 4    │    │ ← Event dots
│  │  5  6  7🎉 8  9  10 11      │    │
│  │  12 13 14⚽15 16 17 18      │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [Selected Date Events]             │
│  ┌──────────────────────────────┐   │
│  │ ⚽ Match vs Leicester        │   │
│  │ Saturday, 3:00 PM            │   │
│  │ Local Ground                 │   │
│  │                               │   │
│  │ Going: 12 | Maybe: 3         │   │
│  │ [YOUR RSVP: Going ✓]         │   │
│  └──────────────────────────────┘   │
│                                     │
│  [More events on selected date...]  │
└─────────────────────────────────────┘
```

**Key Features**:
- **Calendar Widget**:
  - Clean, minimal design with event dots
  - Color-coded dots: ⚽ matches (green), 🏃 training (blue), 🎉 social (orange)
  - Swipe between months with smooth animation
  - Today's date highlighted with primary color
  - Selected date highlighted with subtle background

- **Event List**:
  - Shows all events for selected date
  - Card design consistent with home screen
  - Quick RSVP toggle (no modal needed)
  - Attendee count with avatars
  - Tap card to see full event details (modal)

- **Interactions**:
  - Tap date to select and show events
  - Swipe left/right to change months
  - Tap event card to open detail modal
  - Tap RSVP to change status (haptic feedback)
  - Pull to refresh to sync latest events

**Component Breakdown**:
```typescript
// src/screens/Calendar/CalendarScreen.tsx

import React, { useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { EventList } from './components/EventList';
import { EventDetailModal } from './components/EventDetailModal';
import { useEvents } from '@/hooks/useEvents';

export const CalendarScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { events, markedDates } = useEvents();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const eventsForDate = events.filter(
    e => isSameDay(e.date, selectedDate)
  );

  return (
    <View>
      <Calendar
        markedDates={markedDates}
        onDayPress={day => setSelectedDate(new Date(day.dateString))}
        theme={{
          todayTextColor: COLORS.primary,
          selectedDayBackgroundColor: COLORS.primary,
        }}
      />

      <EventList
        events={eventsForDate}
        onEventPress={event => {
          setSelectedEvent(event);
          setModalVisible(true);
        }}
      />

      <EventDetailModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};
```

---

### 3. Fixtures Screen (Matches + Results)

**Purpose**: View upcoming matches and past results with scores

**Layout**:
```
┌─────────────────────────────────────┐
│  [Tabs: Upcoming | Results]         │
├─────────────────────────────────────┤
│  [Match Cards]                      │
│  ┌──────────────────────────────┐   │
│  │ Saturday, 3:00 PM            │   │
│  │                               │   │
│  │ [Badge]    vs    [Badge]     │   │ ← Team badges
│  │ SYSTON         LEICESTER     │   │
│  │                               │   │
│  │ Local Ground                 │   │
│  │ League Cup                   │   │ ← Competition badge
│  └──────────────────────────────┘   │
│                                     │
│  [More matches...]                  │
└─────────────────────────────────────┘
```

**Key Features**:
- **Upcoming Matches**:
  - Chronological order (soonest first)
  - Countdown timer for next match
  - Weather forecast for outdoor games
  - Tap to add to device calendar (.ics export)

- **Results**:
  - Final score prominently displayed
  - Scorers listed with goal icons
  - Yellow/red cards shown
  - Match report link (if available)
  - Tap to see full match stats

**Design Details**:
- Large team badges (80px) with team names below
- Score display: 48px bold font (if result)
- Competition badge in top-right corner
- Gradient background based on result (green = win, red = loss, gray = draw)

---

### 4. Squad Screen (Team Roster)

**Purpose**: View team squad with player stats

**Layout**:
```
┌─────────────────────────────────────┐
│  [Search Bar]                       │
├─────────────────────────────────────┤
│  [Filter: All | GK | DEF | MID | FWD]│
├─────────────────────────────────────┤
│  [Player Cards Grid]                │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │[Photo]│ │[Photo]│ │[Photo]│       │
│  │  #1  │ │  #5  │ │  #7  │       │ ← Jersey number
│  │ Tom  │ │ Mike │ │ Jake │       │ ← First name
│  │Wilson│ │Jones│  │Smith│       │ ← Last name
│  │  GK  │ │ DEF  │ │ MID  │       │ ← Position badge
│  └──────┘  └──────┘  └──────┘       │
└─────────────────────────────────────┘
```

**Key Features**:
- **Player Cards**:
  - Square cards (3 per row on phone, 4 on tablet)
  - Player photo with gradient overlay
  - Jersey number prominently displayed
  - Position badge color-coded:
    - GK: Orange
    - DEF: Blue
    - MID: Green
    - FWD: Red
  - Tap to see full player profile

- **Player Profile Modal**:
  - Large photo header
  - Stats table: Appearances, Goals, Assists, Cards
  - Recent form (last 5 matches)
  - Bio section (age, date of birth, joined date)

---

### 5. Videos Screen (Record/Upload/View)

**Purpose**: Record match videos, upload clips, view highlights

**Layout**:
```
┌─────────────────────────────────────┐
│  [Header: Videos]                   │
├─────────────────────────────────────┤
│  [Action Buttons]                   │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ 📹 RECORD    │  │ 📁 SELECT    │ │ ← Large buttons
│  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────┤
│  [Recent Highlights]                │
│  ┌──────────────────────────────┐   │
│  │ [Thumbnail with play icon]   │   │
│  │ Goal - Jake Smith            │   │
│  │ 2 hours ago | 45"           │   │
│  │ Processing... [Progress bar] │   │ ← If processing
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Key Features**:
- **Recording**:
  - In-app camera with 5-minute limit
  - Countdown timer during recording
  - Pause/resume functionality
  - Quality selector (720p/1080p)

- **Upload**:
  - Select from device library
  - Preview before upload
  - Progress bar with cancel option
  - Background upload (continue using app)

- **Highlights List**:
  - Video thumbnails with duration overlay
  - Processing status (with animated progress)
  - Tap to play in full-screen player
  - Share to social media (native share sheet)

---

### 6. Settings Screen

**Purpose**: User preferences, notifications, account management

**Layout**:
```
┌─────────────────────────────────────┐
│  [Profile Section]                  │
│  [Avatar] John Smith               │
│            john@email.com          │
│            [Edit Profile]          │
├─────────────────────────────────────┤
│  [Settings Groups]                  │
│                                     │
│  NOTIFICATIONS                      │
│  ├ Match Updates        [Toggle]   │
│  ├ Training Reminders   [Toggle]   │
│  └ Social Posts         [Toggle]   │
│                                     │
│  PREFERENCES                        │
│  ├ Language             English >  │
│  ├ Theme                System >   │
│  └ Data Usage           WiFi Only >│
│                                     │
│  ABOUT                              │
│  ├ Terms & Conditions              │
│  ├ Privacy Policy                  │
│  └ Version 1.0.0                   │
└─────────────────────────────────────┘
```

---

## 🔧 Technical Implementation Requirements

### API Integration

**Base API Client** (`src/services/api.ts`):
```typescript
import axios from 'axios';
import { API_BASE_URL, TENANT_ID } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
api.interceptors.request.use(config => {
  const token = getAuthToken(); // from secure storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized (logout)
      handleLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
```

**API Endpoints** (all must be implemented):

```typescript
// Feed API
export const feedApi = {
  getPosts: (page = 1, limit = 20) =>
    api.get('/api/v1/feed', { params: { tenant: TENANT_ID, page, limit } }),

  likePost: (postId: string) =>
    api.post(`/api/v1/feed/${postId}/like`, { tenant: TENANT_ID }),

  commentOnPost: (postId: string, comment: string) =>
    api.post(`/api/v1/feed/${postId}/comment`, { tenant: TENANT_ID, comment }),
};

// Events API
export const eventsApi = {
  getEvents: (limit = 50) =>
    api.get('/api/v1/events', { params: { tenant: TENANT_ID, limit } }),

  rsvp: (eventId: string, status: 'going' | 'maybe' | 'not_going') =>
    api.post(`/api/v1/events/${eventId}/rsvp`, { tenant: TENANT_ID, status }),

  getAttendees: (eventId: string) =>
    api.get(`/api/v1/events/${eventId}/attendees`, { params: { tenant: TENANT_ID } }),
};

// Fixtures API
export const fixturesApi = {
  getUpcoming: () =>
    api.get('/api/v1/fixtures/upcoming', { params: { tenant: TENANT_ID } }),

  getResults: () =>
    api.get('/api/v1/fixtures/results', { params: { tenant: TENANT_ID } }),

  getNextFixture: () =>
    api.get('/api/v1/fixtures/next', { params: { tenant: TENANT_ID } }),
};

// Squad API
export const squadApi = {
  getSquad: () =>
    api.get('/api/v1/squad', { params: { tenant: TENANT_ID } }),

  getPlayer: (playerId: string) =>
    api.get(`/api/v1/squad/${playerId}`, { params: { tenant: TENANT_ID } }),
};

// Videos API
export const videosApi = {
  upload: (videoUri: string, metadata: any) => {
    const formData = new FormData();
    formData.append('video', {
      uri: videoUri,
      name: 'video.mp4',
      type: 'video/mp4',
    } as any);
    formData.append('tenant', TENANT_ID);
    formData.append('metadata', JSON.stringify(metadata));

    return api.post('/api/v1/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getRecent: () =>
    api.get('/api/v1/videos', { params: { tenant: TENANT_ID } }),

  getStatus: (videoId: string) =>
    api.get(`/api/v1/videos/${videoId}/status`, { params: { tenant: TENANT_ID } }),
};
```

### State Management (Zustand)

```typescript
// src/store/authStore.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await authApi.login(email, password);
        set({
          user: response.data.user,
          token: response.data.token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      getStorage: () => AsyncStorage,
    }
  )
);
```

### Custom Hooks (React Query)

```typescript
// src/hooks/useFeed.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '@/services/api';

export const useFeed = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => feedApi.getPosts(),
    staleTime: 30000, // 30 seconds
  });

  const likeMutation = useMutation({
    mutationFn: feedApi.likePost,
    onSuccess: () => {
      queryClient.invalidateQueries(['feed']);
    },
  });

  return {
    posts: data?.data?.data || [],
    loading: isLoading,
    refresh: refetch,
    likePost: likeMutation.mutate,
  };
};
```

### Animations (Reanimated 3)

```typescript
// src/components/common/AnimatedCard.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const AnimatedCard = ({ children, onPress }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    opacity.value = withTiming(0.8, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1, { duration: 150 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
```

---

## 🎯 Specific Component Requirements

### Reusable Components to Build

1. **Button** (`src/components/common/Button.tsx`)
   - Variants: primary, secondary, outline, ghost, danger
   - Sizes: small (36px), medium (44px), large (52px)
   - States: default, pressed, disabled, loading
   - Icons: left, right, or icon-only
   - Haptic feedback on press

2. **Card** (`src/components/common/Card.tsx`)
   - Shadow variants: none, small, medium, large
   - Padding variants: none, small, medium, large
   - Border radius: 8px, 12px, 16px
   - Pressable variant with scale animation

3. **Input** (`src/components/common/Input.tsx`)
   - Variants: default, search, multiline
   - States: default, focused, error, disabled
   - Icons: left, right
   - Helper text and error messages
   - Character counter for limited inputs

4. **Avatar** (`src/components/common/Avatar.tsx`)
   - Sizes: xs (24px), sm (32px), md (40px), lg (56px), xl (80px)
   - Fallback to initials if no image
   - Status indicator (online/offline dot)
   - Border variant

5. **Badge** (`src/components/common/Badge.tsx`)
   - Variants: primary, success, warning, error, info
   - Sizes: small, medium
   - Dot variant (no text)
   - Count variant (number badge)

6. **BottomSheet** (`src/components/overlays/BottomSheet.tsx`)
   - Snap points: [25%, 50%, 75%, 90%]
   - Swipe to dismiss
   - Handle bar at top
   - Backdrop with tap-to-close

7. **Toast** (`src/components/overlays/Toast.tsx`)
   - Variants: success, error, warning, info
   - Auto-dismiss after 3 seconds
   - Swipe to dismiss
   - Queue multiple toasts

8. **SkeletonLoader** (`src/components/common/SkeletonLoader.tsx`)
   - Variants: post, event, player, match
   - Shimmer animation
   - Respects theme (light/dark)

9. **EmptyState** (`src/components/common/EmptyState.tsx`)
   - Icon/illustration
   - Title + description
   - Primary CTA button
   - Different variants per screen

---

## 📐 Layout & Navigation

### Bottom Tab Navigator

```typescript
// src/navigation/BottomTabNavigator.tsx

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 8,
        shadowOpacity: 0.1,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home" size={size} color={color} />
        ),
      }}
    />

    <Tab.Screen
      name="Calendar"
      component={CalendarScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="calendar" size={size} color={color} />
        ),
      }}
    />

    <Tab.Screen
      name="Fixtures"
      component={FixturesScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="soccer" size={size} color={color} />
        ),
      }}
    />

    <Tab.Screen
      name="Squad"
      component={SquadScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account-group" size={size} color={color} />
        ),
      }}
    />

    <Tab.Screen
      name="Videos"
      component={VideosScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="video" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);
```

---

## ✅ Quality Checklist (Must Pass All)

### Performance
- [ ] App launches in <2 seconds (cold start)
- [ ] All screens render in <300ms
- [ ] Animations run at 60fps (no jank)
- [ ] Images lazy-load and cached
- [ ] API responses cached appropriately
- [ ] Offline mode works (cached data shown)

### Accessibility
- [ ] All touchable elements are 44x44px minimum
- [ ] Color contrast ratio > 4.5:1 for text
- [ ] Screen reader support (accessibility labels)
- [ ] Focus indicators visible
- [ ] Forms have proper labels and error messages

### User Experience
- [ ] No spinners (use skeleton loaders)
- [ ] Errors have helpful messages + retry button
- [ ] Empty states have illustrations + CTAs
- [ ] Loading states are smooth (no flashing)
- [ ] Success feedback is immediate (haptic + visual)
- [ ] Pull-to-refresh works on all list screens

### Code Quality
- [ ] TypeScript strict mode (no `any` types)
- [ ] All components have prop types defined
- [ ] Consistent naming conventions
- [ ] No console.log statements (use proper logging)
- [ ] Error boundaries catch crashes
- [ ] Tests pass (>80% coverage)

### Design Consistency
- [ ] All screens follow design system
- [ ] Spacing uses SPACING constants (no magic numbers)
- [ ] Colors use COLORS constants (no hardcoded hex)
- [ ] Typography uses TYPOGRAPHY constants
- [ ] Shadows use SHADOWS constants
- [ ] All animations use ANIMATION constants

---

## 🚀 Deployment Requirements

### Configuration

**File**: `app.json`
```json
{
  "expo": {
    "name": "Syston Tigers",
    "slug": "syston-tigers",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFD700"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.systontigers.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFD700"
      },
      "package": "com.systontigers.app"
    }
  }
}
```

### Environment Variables

**File**: `.env`
```
API_BASE_URL=https://app.team-platform-2025.workers.dev
TENANT_ID=syston-tigers
SENTRY_DSN=your_sentry_dsn_here
```

---

## 🎨 Design Assets Needed

1. **App Icon**: 1024x1024px PNG (transparent background)
2. **Splash Screen**: 1242x2688px PNG (Syston yellow background)
3. **Club Badge**: 512x512px PNG (transparent)
4. **Default Avatar**: 200x200px PNG (neutral silhouette)
5. **Empty State Illustrations**: 300x300px SVG (for each screen)
6. **Team Badges**: 200x200px PNG per opponent team

---

## 📚 Documentation Requirements

For every component, include:
1. **Purpose**: What it does
2. **Props**: TypeScript interface with JSDoc comments
3. **Usage Example**: Code snippet showing how to use it
4. **Variants**: All visual variants
5. **States**: All interactive states (hover, pressed, disabled, etc.)

Example:
```typescript
/**
 * Primary button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button
 *   variant="primary"
 *   size="medium"
 *   onPress={() => console.log('Pressed')}
 * >
 *   Press Me
 * </Button>
 * ```
 */
export interface ButtonProps {
  /** Button label text */
  children: string;

  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

  /** Button size */
  size?: 'small' | 'medium' | 'large';

  /** Disabled state */
  disabled?: boolean;

  /** Loading state (shows spinner) */
  loading?: boolean;

  /** Icon to show on left */
  leftIcon?: string;

  /** Icon to show on right */
  rightIcon?: string;

  /** Press handler */
  onPress: () => void;
}
```

---

## 🎯 Summary: What Google AI Studio Should Deliver

**Primary Deliverable**: Complete, production-ready React Native mobile app that:

1. ✅ Implements all 6 main screens (Home, Calendar, Fixtures, Squad, Videos, Settings)
2. ✅ Connects to all backend APIs (feed, events, fixtures, squad, videos)
3. ✅ Uses professional design system (colors, typography, spacing, shadows)
4. ✅ Includes all reusable components (buttons, cards, inputs, modals, etc.)
5. ✅ Has smooth animations (60fps, no jank)
6. ✅ Handles all states (loading, error, empty, offline)
7. ✅ Follows accessibility guidelines (WCAG 2.1 AA)
8. ✅ Is fully typed with TypeScript (strict mode)
9. ✅ Has proper error handling and retry logic
10. ✅ Is ready to deploy to App Store and Google Play

**Quality Bar**: The app should feel like a £50/month premium sports app, not a free community app. Every interaction should be delightful, every screen should be polished, and every edge case should be handled gracefully.

---

**Instructions Version**: 1.0
**Created**: 2025-11-03
**Target Quality**: World-Class / Premier League Standard
**Working Directory**: C:\dev\app-FRESH

---

**Let's build something incredible! 🏆⚽📱**
