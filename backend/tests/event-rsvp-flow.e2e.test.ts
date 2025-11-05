import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import { issueTenantMemberJWT } from "../src/services/jwt";

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (!value) return null;
    if (type === "json") return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class EventDB {
  private events = new Map<string, any>();
  private rsvps = new Map<string, any[]>();
  private users = new Map<string, any>();
  private nextEventId = 1;
  private nextRsvpId = 1;

  constructor() {
    // Seed with test users
    this.users.set("user-1", {
      id: "user-1",
      tenant_id: "test-tenant",
      email: "user1@test.com",
      roles: JSON.stringify(["tenant_member"]),
    });
    this.users.set("user-2", {
      id: "user-2",
      tenant_id: "test-tenant",
      email: "user2@test.com",
      roles: JSON.stringify(["tenant_member"]),
    });
  }

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          // Get user
          if (query.includes("FROM users") && query.includes("WHERE id")) {
            const userId = params[0];
            return this.users.get(userId) || null;
          }

          // Get event
          if (query.includes("FROM events") && query.includes("WHERE id")) {
            const eventId = params[0];
            return this.events.get(eventId) || null;
          }

          // Get RSVP
          if (query.includes("FROM rsvps")) {
            const eventId = params.find((p: any) => this.events.has(p));
            const userId = params.find((p: any) => this.users.has(p));
            const rsvps = this.rsvps.get(eventId) || [];
            return rsvps.find((r: any) => r.user_id === userId) || null;
          }

          return null;
        },
        all: async () => {
          // Get events
          if (query.includes("FROM events")) {
            const tenantId = params[0];
            const events = Array.from(this.events.values()).filter(
              (e: any) => e.tenant_id === tenantId
            );
            return { results: events };
          }

          // Get RSVPs for event
          if (query.includes("FROM rsvps")) {
            const eventId = params[0];
            const rsvps = this.rsvps.get(eventId) || [];
            return { results: rsvps };
          }

          return { results: [] };
        },
        run: async () => {
          // Create event
          if (query.includes("INSERT INTO events")) {
            const eventId = `event-${this.nextEventId++}`;
            const tenantId = params[0];
            const title = params[1];
            const date = params[2];

            this.events.set(eventId, {
              id: eventId,
              tenant_id: tenantId,
              title: title,
              date: date,
              location: params[3] || null,
              description: params[4] || null,
              rsvp_yes_count: 0,
              rsvp_no_count: 0,
              rsvp_maybe_count: 0,
              created_at: new Date().toISOString(),
            });
            this.rsvps.set(eventId, []);

            return {
              success: true,
              meta: { last_row_id: this.nextEventId - 1 }
            };
          }

          // Create RSVP
          if (query.includes("INSERT INTO rsvps")) {
            const rsvpId = `rsvp-${this.nextRsvpId++}`;
            const eventId = params[0];
            const userId = params[1];
            const status = params[2];

            const rsvp = {
              id: rsvpId,
              event_id: eventId,
              user_id: userId,
              status: status,
              created_at: new Date().toISOString(),
            };

            const rsvps = this.rsvps.get(eventId) || [];
            rsvps.push(rsvp);
            this.rsvps.set(eventId, rsvps);

            // Update event counts
            const event = this.events.get(eventId);
            if (event) {
              if (status === "yes") event.rsvp_yes_count++;
              else if (status === "no") event.rsvp_no_count++;
              else if (status === "maybe") event.rsvp_maybe_count++;
            }

            return { success: true };
          }

          // Update RSVP
          if (query.includes("UPDATE rsvps")) {
            const eventId = params.find((p: any) => this.events.has(p));
            const userId = params.find((p: any) => this.users.has(p));
            const newStatus = params[0];

            const rsvps = this.rsvps.get(eventId) || [];
            const rsvp = rsvps.find((r: any) => r.user_id === userId);

            if (rsvp) {
              const event = this.events.get(eventId);
              if (event) {
                // Decrement old status count
                if (rsvp.status === "yes") event.rsvp_yes_count--;
                else if (rsvp.status === "no") event.rsvp_no_count--;
                else if (rsvp.status === "maybe") event.rsvp_maybe_count--;

                // Increment new status count
                if (newStatus === "yes") event.rsvp_yes_count++;
                else if (newStatus === "no") event.rsvp_no_count++;
                else if (newStatus === "maybe") event.rsvp_maybe_count++;
              }

              rsvp.status = newStatus;
            }

            return { success: true };
          }

          // Delete RSVP
          if (query.includes("DELETE FROM rsvps")) {
            const eventId = params[0];
            const userId = params[1];

            const rsvps = this.rsvps.get(eventId) || [];
            const rsvpIndex = rsvps.findIndex((r: any) => r.user_id === userId);

            if (rsvpIndex !== -1) {
              const rsvp = rsvps[rsvpIndex];
              const event = this.events.get(eventId);

              if (event) {
                // Decrement count
                if (rsvp.status === "yes") event.rsvp_yes_count--;
                else if (rsvp.status === "no") event.rsvp_no_count--;
                else if (rsvp.status === "maybe") event.rsvp_maybe_count--;
              }

              rsvps.splice(rsvpIndex, 1);
            }

            return { success: true };
          }

          return { success: true };
        },
      }),
    };
  }
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as ExecutionContext;
}

function createEnv() {
  const kv = new MemoryKV();
  const db = new EventDB();

  return {
    API_VERSION: "v1",
    JWT_SECRET: "e2e-test-secret-key-at-least-32-characters-long",
    JWT_ISSUER: "e2e-test-issuer",
    JWT_AUDIENCE: "syston-mobile",
    SETUP_URL: "https://setup.test",
    ADMIN_CONSOLE_URL: "https://admin.test",
    YT_REDIRECT_URL: "https://example.com/yt",
    KV_IDEMP: kv,
    DB: db,
    POST_QUEUE: { send: async () => {} },
    DLQ: { send: async () => {} },
    TenantRateLimiter: { idFromName: () => ({}) },
    VotingRoom: { idFromName: () => ({}) },
    ChatRoom: { idFromName: () => ({}) },
    MatchRoom: { idFromName: () => ({}) },
    GeoFenceManager: { idFromName: () => ({}) },
    R2_MEDIA: { put: async () => {}, get: async () => null },
  } as Record<string, any>;
}

describe("Event & RSVP E2E Flow", () => {
  let env: any;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = createEnv();
    ctx = createExecutionContext();
  });

  it("completes full event creation and RSVP workflow", async () => {
    // Step 1: Create JWT for user
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Step 2: Create an event
    const createEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Team Training",
        date: "2025-12-01T18:00:00Z",
        location: "Home Ground",
        description: "Weekly team training session",
      }),
    });

    const createEventResponse = await worker.fetch(createEventRequest, env, ctx);
    expect(createEventResponse.status).toBe(201);
    const eventData: any = await createEventResponse.json();
    expect(eventData.success).toBe(true);
    expect(eventData.data.event.id).toBeDefined();
    const eventId = eventData.data.event.id;

    // Step 3: Get event details
    const getEventRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getEventResponse = await worker.fetch(getEventRequest, env, ctx);
    expect(getEventResponse.status).toBe(200);
    const getEventData: any = await getEventResponse.json();
    expect(getEventData.data.event.title).toBe("Team Training");
    expect(getEventData.data.event.rsvp_yes_count).toBe(0);

    // Step 4: RSVP "yes" to the event
    const rsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "yes",
        }),
      }
    );

    const rsvpResponse = await worker.fetch(rsvpRequest, env, ctx);
    expect(rsvpResponse.status).toBe(200);
    const rsvpData: any = await rsvpResponse.json();
    expect(rsvpData.success).toBe(true);

    // Step 5: Verify RSVP count updated
    const getEventAfterRsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getEventAfterRsvpResponse = await worker.fetch(
      getEventAfterRsvpRequest,
      env,
      ctx
    );
    expect(getEventAfterRsvpResponse.status).toBe(200);
    const getEventAfterRsvpData: any = await getEventAfterRsvpResponse.json();
    expect(getEventAfterRsvpData.data.event.rsvp_yes_count).toBe(1);

    // Step 6: Update RSVP to "maybe"
    const updateRsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "maybe",
        }),
      }
    );

    const updateRsvpResponse = await worker.fetch(updateRsvpRequest, env, ctx);
    expect(updateRsvpResponse.status).toBe(200);

    // Step 7: Verify counts updated correctly
    const getEventAfterUpdateRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getEventAfterUpdateResponse = await worker.fetch(
      getEventAfterUpdateRequest,
      env,
      ctx
    );
    const getEventAfterUpdateData: any = await getEventAfterUpdateResponse.json();
    expect(getEventAfterUpdateData.data.event.rsvp_yes_count).toBe(0);
    expect(getEventAfterUpdateData.data.event.rsvp_maybe_count).toBe(1);

    // Step 8: Get all RSVPs for the event
    const getRsvpsRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvps`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getRsvpsResponse = await worker.fetch(getRsvpsRequest, env, ctx);
    if (getRsvpsResponse.status === 200) {
      const getRsvpsData: any = await getRsvpsResponse.json();
      expect(getRsvpsData.data.rsvps).toHaveLength(1);
      expect(getRsvpsData.data.rsvps[0].status).toBe("maybe");
    }

    // Step 9: Cancel RSVP
    const cancelRsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const cancelRsvpResponse = await worker.fetch(cancelRsvpRequest, env, ctx);
    expect(cancelRsvpResponse.status).toBe(200);

    // Step 10: Verify count decreased
    const getEventAfterCancelRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getEventAfterCancelResponse = await worker.fetch(
      getEventAfterCancelRequest,
      env,
      ctx
    );
    const getEventAfterCancelData: any = await getEventAfterCancelResponse.json();
    expect(getEventAfterCancelData.data.event.rsvp_maybe_count).toBe(0);
  });

  it("handles multiple users RSVPing to same event", async () => {
    // Create tokens for two users
    const user1Token = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    const user2Token = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-2",
      roles: ["tenant_member"],
    });

    // User 1 creates an event
    const createEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${user1Token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Match Day",
        date: "2025-12-15T15:00:00Z",
        location: "Stadium",
      }),
    });

    const createEventResponse = await worker.fetch(createEventRequest, env, ctx);
    const eventData: any = await createEventResponse.json();
    const eventId = eventData.data.event.id;

    // User 1 RSVPs "yes"
    const user1RsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user1Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "yes" }),
      }
    );

    await worker.fetch(user1RsvpRequest, env, ctx);

    // User 2 RSVPs "yes"
    const user2RsvpRequest = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user2Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "yes" }),
      }
    );

    await worker.fetch(user2RsvpRequest, env, ctx);

    // Verify count is 2
    const getEventRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      }
    );

    const getEventResponse = await worker.fetch(getEventRequest, env, ctx);
    const getEventData: any = await getEventResponse.json();
    expect(getEventData.data.event.rsvp_yes_count).toBe(2);
  });

  it("requires authentication for event operations", async () => {
    // Try to create event without authentication
    const createEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Unauthorized Event",
        date: "2025-12-01T18:00:00Z",
      }),
    });

    const createEventResponse = await worker.fetch(createEventRequest, env, ctx);
    expect([401, 403]).toContain(createEventResponse.status);
  });

  it("validates event data before creation", async () => {
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Try to create event with missing required fields
    const invalidEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // Missing title and date
        location: "Somewhere",
      }),
    });

    const invalidEventResponse = await worker.fetch(invalidEventRequest, env, ctx);
    expect(invalidEventResponse.status).toBe(400);
  });

  it("prevents duplicate RSVPs (updates existing)", async () => {
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Create event
    const createEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Training",
        date: "2025-12-01T18:00:00Z",
      }),
    });

    const createEventResponse = await worker.fetch(createEventRequest, env, ctx);
    const eventData: any = await createEventResponse.json();
    const eventId = eventData.data.event.id;

    // RSVP twice
    const rsvp1Request = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "yes" }),
      }
    );

    await worker.fetch(rsvp1Request, env, ctx);

    const rsvp2Request = new Request(
      `https://example.com/api/v1/events/${eventId}/rsvp`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "no" }),
      }
    );

    await worker.fetch(rsvp2Request, env, ctx);

    // Verify only one RSVP exists and status was updated
    const getEventRequest = new Request(
      `https://example.com/api/v1/events/${eventId}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      }
    );

    const getEventResponse = await worker.fetch(getEventRequest, env, ctx);
    const getEventData: any = await getEventResponse.json();

    // Should have 0 yes, 1 no (updated from yes to no)
    expect(getEventData.data.event.rsvp_yes_count).toBe(0);
    expect(getEventData.data.event.rsvp_no_count).toBe(1);
  });
});
