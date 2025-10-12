// backend/src/do/geoFenceManager.ts
import type { Env } from "../types";

interface UserLocation {
  token: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface VenueLocation {
  latitude: number;
  longitude: number;
}

interface GeoFenceState {
  tenant: string;
  matchId: string;
  venueLocation?: VenueLocation;
  userLocations: Map<string, UserLocation>; // token -> location
  lastCleanup: number;
}

export class GeoFenceManager {
  state: DurableObjectState;
  env: Env;
  geoState: GeoFenceState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async load() {
    const stored = await this.state.storage.get<GeoFenceState>("geoState");
    if (stored) {
      // Convert plain object to Map
      this.geoState = {
        ...stored,
        userLocations: new Map(Object.entries(stored.userLocations || {})),
      };
    }
  }

  private async save() {
    if (!this.geoState) return;

    // Convert Map to plain object for storage
    const toStore = {
      ...this.geoState,
      userLocations: Object.fromEntries(this.geoState.userLocations),
    };

    await this.state.storage.put("geoState", toStore);
  }

  /**
   * Initialize geo-fence for a match
   */
  async init(data: { tenant: string; matchId: string; venueLatitude?: number; venueLongitude?: number }) {
    await this.load();

    this.geoState = {
      tenant: data.tenant,
      matchId: data.matchId,
      venueLocation: data.venueLatitude && data.venueLongitude
        ? { latitude: data.venueLatitude, longitude: data.venueLongitude }
        : undefined,
      userLocations: new Map(),
      lastCleanup: Date.now(),
    };

    await this.save();
    return { ok: true };
  }

  /**
   * Update user location
   */
  async updateLocation(data: { token: string; latitude: number; longitude: number }) {
    await this.load();

    if (!this.geoState) {
      throw new Error("Geo-fence not initialized");
    }

    const location: UserLocation = {
      token: data.token,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: Date.now(),
    };

    this.geoState.userLocations.set(data.token, location);
    await this.save();

    // Cleanup old locations every 5 minutes
    if (Date.now() - this.geoState.lastCleanup > 300000) {
      await this.cleanupOldLocations();
    }

    return { ok: true };
  }

  /**
   * Set venue location
   */
  async setVenue(data: { latitude: number; longitude: number }) {
    await this.load();

    if (!this.geoState) {
      throw new Error("Geo-fence not initialized");
    }

    this.geoState.venueLocation = {
      latitude: data.latitude,
      longitude: data.longitude,
    };

    await this.save();
    return { ok: true };
  }

  /**
   * Get tokens of users who should receive notification (>500m from venue)
   */
  async getNotificationTokens(): Promise<string[]> {
    await this.load();

    if (!this.geoState || !this.geoState.venueLocation) {
      // If no venue location set, send to all users
      return Array.from(this.geoState?.userLocations.keys() || []);
    }

    const tokens: string[] = [];
    const venue = this.geoState.venueLocation;

    for (const [token, userLoc] of this.geoState.userLocations.entries()) {
      const distance = this.calculateDistance(
        userLoc.latitude,
        userLoc.longitude,
        venue.latitude,
        venue.longitude
      );

      // Only send to users > 500m away
      if (distance > 500) {
        tokens.push(token);
      } else {
        console.log(`[GeoFence] User ${token} is at venue (${distance.toFixed(0)}m), skipping notification`);
      }
    }

    return tokens;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Clean up locations older than 10 minutes
   */
  private async cleanupOldLocations() {
    if (!this.geoState) return;

    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    for (const [token, location] of this.geoState.userLocations.entries()) {
      if (now - location.timestamp > maxAge) {
        this.geoState.userLocations.delete(token);
        console.log(`[GeoFence] Removed stale location for token ${token}`);
      }
    }

    this.geoState.lastCleanup = now;
    await this.save();
  }

  /**
   * Get current state (for debugging)
   */
  async getState() {
    await this.load();

    if (!this.geoState) {
      return { ok: false, error: "Not initialized" };
    }

    return {
      ok: true,
      data: {
        tenant: this.geoState.tenant,
        matchId: this.geoState.matchId,
        venueLocation: this.geoState.venueLocation,
        userCount: this.geoState.userLocations.size,
        users: Array.from(this.geoState.userLocations.values()).map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          age: Date.now() - loc.timestamp,
        })),
      },
    };
  }

  async fetch(req: Request) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname.endsWith("/init")) {
      const body = (await req.json()) as any;
      return Response.json(await this.init(body));
    }

    if (req.method === "POST" && url.pathname.endsWith("/location")) {
      const body = (await req.json()) as any;
      return Response.json(await this.updateLocation(body));
    }

    if (req.method === "POST" && url.pathname.endsWith("/venue")) {
      const body = (await req.json()) as any;
      return Response.json(await this.setVenue(body));
    }

    if (req.method === "GET" && url.pathname.endsWith("/tokens")) {
      const tokens = await this.getNotificationTokens();
      return Response.json({ ok: true, tokens });
    }

    if (req.method === "GET" && url.pathname.endsWith("/state")) {
      return Response.json(await this.getState());
    }

    return new Response("Not found", { status: 404 });
  }
}
