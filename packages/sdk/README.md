# @team-platform/sdk

Shared TypeScript SDK for the multi-tenant team platform API.

## Features

- ✅ **Multi-tenant support** - Automatically adds `x-tenant` header to all requests
- ✅ **Type-safe** - Full TypeScript support with exported types
- ✅ **Authentication** - JWT token management
- ✅ **White-label branding** - Get/set brand kit per tenant
- ✅ **Comprehensive API coverage** - All endpoints wrapped

## Installation

```bash
npm install @team-platform/sdk
```

## Usage

### Basic Setup

```typescript
import { TeamPlatformSDK } from '@team-platform/sdk';

const sdk = new TeamPlatformSDK({
  apiBaseUrl: 'https://api.yourplatform.com',
  tenantId: 'your-club-name',
  authToken: 'optional-jwt-token',
  timeout: 30000, // optional, defaults to 30s
});
```

### Brand API

```typescript
// Get brand kit
const brand = await sdk.getBrand();
console.log(brand.primaryColor); // "#6CC5FF"

// Update brand (admin only)
await sdk.setBrand({
  primaryColor: '#FF0000',
  secondaryColor: '#000000',
  clubBadge: 'https://...',
});
```

### Fixtures & Results

```typescript
// Get upcoming fixtures
const fixtures = await sdk.listFixtures();

// Get past results
const results = await sdk.listResults();

// Get league table
const table = await sdk.getLeagueTable('premier', '2024-25');
```

### Squad & Stats

```typescript
// Get squad
const squad = await sdk.getSquad();

// Get player details
const player = await sdk.getPlayer('player-id');

// Get top scorers
const topScorers = await sdk.getTopScorers(10);

// Get team stats
const stats = await sdk.getTeamStats();
```

### News Feed

```typescript
// Get feed
const posts = await sdk.listFeed(1, 20);

// Create post (admin only)
const post = await sdk.createPost(
  'Great win today!',
  {
    app_feed: true,
    twitter: true,
    facebook: false,
  },
  ['https://...']
);
```

### Events

```typescript
// List events
const events = await sdk.listEvents(10);

// Get event details
const event = await sdk.getEvent('event-id');

// Create event (admin only)
await sdk.createEvent({
  title: 'Training Session',
  type: 'training',
  startDate: '2025-10-25T18:00:00Z',
  location: 'Training Ground',
});
```

### Live Updates

```typescript
// Get live events
const liveEvents = await sdk.listLive();

// Post live update (admin only)
await sdk.postLive({
  type: 'goal',
  minute: 23,
  player: 'John Smith',
  description: 'Great finish!',
});
```

### Push Notifications

```typescript
// Register device for push notifications
await sdk.registerPush({
  token: 'expo-push-token',
  platform: 'ios',
  userId: 'user-id',
});

// Send push (admin only)
await sdk.sendPush('Match Alert', 'Goal scored!', { matchId: '123' });

// Unregister device
await sdk.unregisterPush('expo-push-token');
```

### Authentication

```typescript
// Set auth token
sdk.setAuthToken('your-jwt-token');

// Clear auth token
sdk.clearAuthToken();
```

### Switching Tenants

```typescript
// Update tenant at runtime
sdk.setTenant('new-club-name');
```

## TypeScript Types

All types are exported for use in your app:

```typescript
import type {
  BrandKit,
  Fixture,
  Result,
  LeagueTableRow,
  Player,
  TeamStats,
  FeedPost,
  Event,
  LiveEvent,
  PushToken,
  UsageStats,
  TenantConfig,
  ApiResponse,
} from '@team-platform/sdk';
```

## React Native Usage

```typescript
import { TeamPlatformSDK } from '@team-platform/sdk';

// In your App.tsx or config
const sdk = new TeamPlatformSDK({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  tenantId: process.env.EXPO_PUBLIC_TENANT_ID,
});

// Use in components
const MyComponent = () => {
  useEffect(() => {
    const loadBrand = async () => {
      const brand = await sdk.getBrand();
      // Apply brand colors to theme
    };
    loadBrand();
  }, []);
};
```

## Next.js Usage

```typescript
import { TeamPlatformSDK } from '@team-platform/sdk';

// Server component
export async function MyServerComponent() {
  const sdk = new TeamPlatformSDK({
    apiBaseUrl: process.env.API_BASE_URL!,
    tenantId: 'club-name',
  });

  const fixtures = await sdk.listFixtures();

  return <div>{/* render fixtures */}</div>;
}

// Client component
'use client';
export function MyClientComponent() {
  const [brand, setBrand] = useState<BrandKit | null>(null);

  useEffect(() => {
    const sdk = new TeamPlatformSDK({
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!,
      tenantId: 'club-name',
    });

    sdk.getBrand().then(setBrand);
  }, []);

  return <div style={{ color: brand?.primaryColor }}>{/* content */}</div>;
}
```

## Error Handling

```typescript
try {
  const brand = await sdk.getBrand();
} catch (error) {
  if (error.response?.status === 403) {
    console.error('Forbidden');
  } else {
    console.error('API error:', error.message);
  }
}
```

## License

MIT
