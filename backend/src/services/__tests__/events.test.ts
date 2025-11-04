import { describe, it, expect, beforeEach } from "vitest";
import {
  putEvent,
  getEvent,
  deleteEvent,
  listEvents,
  setRsvp,
  getRsvp,
  addCheckin,
  listCheckins,
  EventRec,
  EventType,
} from "../events";

describe("Events Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create a simple in-memory KV store mock
    mockKV = new Map();
    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") return JSON.parse(value);
          return value;
        },
        put: async (key: string, value: string, options?: any) => {
          mockKV.set(key, value);
        },
        delete: async (key: string) => {
          mockKV.delete(key);
        },
      },
    };
  });

  describe("putEvent", () => {
    it("creates a new event", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "training",
        title: "Training Session",
        startUtc: "2025-11-05T10:00:00Z",
        endUtc: "2025-11-05T12:00:00Z",
        location: { name: "Stadium", lat: 40.7128, lng: -74.0060 },
        notes: "Bring your gear",
        teamId: "team-1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      // Verify event is stored
      const stored = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(stored).toBeTruthy();
      expect(stored?.id).toBe("event-1");
      expect(stored?.title).toBe("Training Session");
      expect(stored?.type).toBe("training");
    });

    it("updates an existing event", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "match",
        title: "Game Day",
        startUtc: "2025-11-06T15:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      // Update the event
      const updatedEvent = {
        ...event,
        title: "Updated Game Day",
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", updatedEvent);

      const stored = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(stored?.title).toBe("Updated Game Day");
    });

    it("adds event to index", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "social",
        title: "Team Dinner",
        startUtc: "2025-11-07T18:00:00Z",
        teamId: "team-1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      const list = await listEvents(mockEnv, "tenant-123");
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("event-1");
      expect(list[0].title).toBe("Team Dinner");
    });

    it("maintains event order in index (newest first)", async () => {
      const event1: EventRec = {
        id: "event-1",
        type: "training",
        title: "First Event",
        startUtc: "2025-11-05T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const event2: EventRec = {
        id: "event-2",
        type: "match",
        title: "Second Event",
        startUtc: "2025-11-06T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event1);
      await putEvent(mockEnv, "tenant-123", event2);

      const list = await listEvents(mockEnv, "tenant-123");
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe("event-2"); // Newest first
      expect(list[1].id).toBe("event-1");
    });

    it("supports all event types", async () => {
      const types: EventType[] = ["training", "match", "social"];

      for (const type of types) {
        const event: EventRec = {
          id: `event-${type}`,
          type,
          title: `${type} event`,
          startUtc: "2025-11-05T10:00:00Z",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await putEvent(mockEnv, "tenant-123", event);
        const stored = await getEvent(mockEnv, "tenant-123", `event-${type}`);
        expect(stored?.type).toBe(type);
      }
    });

    it("stores optional fields", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "training",
        title: "Training",
        startUtc: "2025-11-05T10:00:00Z",
        endUtc: "2025-11-05T12:00:00Z",
        location: { name: "Field A", lat: 40.0, lng: -74.0 },
        notes: "Test notes",
        teamId: "team-1",
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      const stored = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(stored?.endUtc).toBe(event.endUtc);
      expect(stored?.location).toEqual(event.location);
      expect(stored?.notes).toBe(event.notes);
      expect(stored?.teamId).toBe(event.teamId);
      expect(stored?.rrule).toBe(event.rrule);
    });
  });

  describe("getEvent", () => {
    it("retrieves an existing event", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "match",
        title: "Big Game",
        startUtc: "2025-11-10T14:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      const retrieved = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe("event-1");
      expect(retrieved?.title).toBe("Big Game");
    });

    it("returns null for non-existent event", async () => {
      const event = await getEvent(mockEnv, "tenant-123", "non-existent");
      expect(event).toBeNull();
    });

    it("enforces tenant isolation", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "training",
        title: "Private Training",
        startUtc: "2025-11-05T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      // Try to access from different tenant
      const retrieved = await getEvent(mockEnv, "tenant-456", "event-1");
      expect(retrieved).toBeNull();
    });
  });

  describe("deleteEvent", () => {
    it("deletes an existing event", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "training",
        title: "Training",
        startUtc: "2025-11-05T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      // Verify it exists
      let stored = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(stored).toBeTruthy();

      // Delete it
      await deleteEvent(mockEnv, "tenant-123", "event-1");

      // Verify it's gone
      stored = await getEvent(mockEnv, "tenant-123", "event-1");
      expect(stored).toBeNull();
    });

    it("removes event from index", async () => {
      const event: EventRec = {
        id: "event-1",
        type: "match",
        title: "Match",
        startUtc: "2025-11-06T15:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event);

      // Verify it's in index
      let list = await listEvents(mockEnv, "tenant-123");
      expect(list).toHaveLength(1);

      // Delete it
      await deleteEvent(mockEnv, "tenant-123", "event-1");

      // Verify it's removed from index
      list = await listEvents(mockEnv, "tenant-123");
      expect(list).toHaveLength(0);
    });

    it("handles deleting non-existent event", async () => {
      // Should not throw
      await expect(
        deleteEvent(mockEnv, "tenant-123", "non-existent")
      ).resolves.not.toThrow();
    });
  });

  describe("listEvents", () => {
    it("returns empty array for tenant with no events", async () => {
      const list = await listEvents(mockEnv, "tenant-123");
      expect(list).toEqual([]);
    });

    it("lists all events for a tenant", async () => {
      const events = [
        {
          id: "event-1",
          type: "training" as EventType,
          title: "Training 1",
          startUtc: "2025-11-05T10:00:00Z",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "event-2",
          type: "match" as EventType,
          title: "Match 1",
          startUtc: "2025-11-06T15:00:00Z",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: "event-3",
          type: "social" as EventType,
          title: "Social 1",
          startUtc: "2025-11-07T18:00:00Z",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      for (const event of events) {
        await putEvent(mockEnv, "tenant-123", event);
      }

      const list = await listEvents(mockEnv, "tenant-123");
      expect(list).toHaveLength(3);
      expect(list.map((e) => e.id)).toContain("event-1");
      expect(list.map((e) => e.id)).toContain("event-2");
      expect(list.map((e) => e.id)).toContain("event-3");
    });

    it("enforces tenant isolation in listing", async () => {
      const event1: EventRec = {
        id: "event-1",
        type: "training",
        title: "Tenant 1 Event",
        startUtc: "2025-11-05T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const event2: EventRec = {
        id: "event-2",
        type: "match",
        title: "Tenant 2 Event",
        startUtc: "2025-11-06T15:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event1);
      await putEvent(mockEnv, "tenant-456", event2);

      const list1 = await listEvents(mockEnv, "tenant-123");
      const list2 = await listEvents(mockEnv, "tenant-456");

      expect(list1).toHaveLength(1);
      expect(list1[0].id).toBe("event-1");

      expect(list2).toHaveLength(1);
      expect(list2[0].id).toBe("event-2");
    });
  });

  describe("setRsvp", () => {
    it("sets RSVP to yes", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");

      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBe("yes");
    });

    it("sets RSVP to no", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "no");

      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBe("no");
    });

    it("sets RSVP to maybe", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "maybe");

      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBe("maybe");
    });

    it("updates existing RSVP", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "no");

      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBe("no");
    });

    it("maintains separate RSVPs per user", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-2", "no");

      const rsvp1 = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      const rsvp2 = await getRsvp(mockEnv, "tenant-123", "event-1", "user-2");

      expect(rsvp1).toBe("yes");
      expect(rsvp2).toBe("no");
    });
  });

  describe("getRsvp", () => {
    it("retrieves existing RSVP", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");

      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBe("yes");
    });

    it("returns null for non-existent RSVP", async () => {
      const rsvp = await getRsvp(mockEnv, "tenant-123", "event-1", "user-1");
      expect(rsvp).toBeNull();
    });

    it("enforces tenant isolation for RSVPs", async () => {
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");

      // Try to get RSVP from different tenant
      const rsvp = await getRsvp(mockEnv, "tenant-456", "event-1", "user-1");
      expect(rsvp).toBeNull();
    });
  });

  describe("addCheckin", () => {
    it("adds a check-in", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins).toHaveLength(1);
      expect(checkins[0].userId).toBe("user-1");
      expect(checkins[0].ts).toBeGreaterThan(0);
    });

    it("adds multiple check-ins", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-2");
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-3");

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins).toHaveLength(3);
      expect(checkins.map((c) => c.userId)).toContain("user-1");
      expect(checkins.map((c) => c.userId)).toContain("user-2");
      expect(checkins.map((c) => c.userId)).toContain("user-3");
    });

    it("allows duplicate check-ins from same user", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins).toHaveLength(2);
      expect(checkins[0].userId).toBe("user-1");
      expect(checkins[1].userId).toBe("user-1");
    });

    it("records timestamp with check-in", async () => {
      const beforeTs = Date.now();
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      const afterTs = Date.now();

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins[0].ts).toBeGreaterThanOrEqual(beforeTs);
      expect(checkins[0].ts).toBeLessThanOrEqual(afterTs);
    });
  });

  describe("listCheckins", () => {
    it("returns empty array for event with no check-ins", async () => {
      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins).toEqual([]);
    });

    it("lists all check-ins for an event", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-2");

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins).toHaveLength(2);
    });

    it("maintains check-in order", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-2");

      const checkins = await listCheckins(mockEnv, "tenant-123", "event-1");
      expect(checkins[0].userId).toBe("user-1");
      expect(checkins[1].userId).toBe("user-2");
      expect(checkins[1].ts).toBeGreaterThan(checkins[0].ts);
    });

    it("enforces tenant isolation for check-ins", async () => {
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");

      // Try to list check-ins from different tenant
      const checkins = await listCheckins(mockEnv, "tenant-456", "event-1");
      expect(checkins).toEqual([]);
    });
  });

  describe("Tenant Isolation", () => {
    it("maintains complete isolation between tenants", async () => {
      // Create events for two different tenants
      const event1: EventRec = {
        id: "event-1",
        type: "training",
        title: "Tenant 1 Training",
        startUtc: "2025-11-05T10:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const event2: EventRec = {
        id: "event-1", // Same ID but different tenant
        type: "match",
        title: "Tenant 2 Match",
        startUtc: "2025-11-06T15:00:00Z",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await putEvent(mockEnv, "tenant-123", event1);
      await putEvent(mockEnv, "tenant-456", event2);

      // Set RSVPs
      await setRsvp(mockEnv, "tenant-123", "event-1", "user-1", "yes");
      await setRsvp(mockEnv, "tenant-456", "event-1", "user-1", "no");

      // Add check-ins
      await addCheckin(mockEnv, "tenant-123", "event-1", "user-1");
      await addCheckin(mockEnv, "tenant-456", "event-1", "user-2");

      // Verify tenant 1 data
      const tenant1Event = await getEvent(mockEnv, "tenant-123", "event-1");
      const tenant1Rsvp = await getRsvp(
        mockEnv,
        "tenant-123",
        "event-1",
        "user-1"
      );
      const tenant1Checkins = await listCheckins(
        mockEnv,
        "tenant-123",
        "event-1"
      );

      expect(tenant1Event?.title).toBe("Tenant 1 Training");
      expect(tenant1Rsvp).toBe("yes");
      expect(tenant1Checkins).toHaveLength(1);
      expect(tenant1Checkins[0].userId).toBe("user-1");

      // Verify tenant 2 data
      const tenant2Event = await getEvent(mockEnv, "tenant-456", "event-1");
      const tenant2Rsvp = await getRsvp(
        mockEnv,
        "tenant-456",
        "event-1",
        "user-1"
      );
      const tenant2Checkins = await listCheckins(
        mockEnv,
        "tenant-456",
        "event-1"
      );

      expect(tenant2Event?.title).toBe("Tenant 2 Match");
      expect(tenant2Rsvp).toBe("no");
      expect(tenant2Checkins).toHaveLength(1);
      expect(tenant2Checkins[0].userId).toBe("user-2");
    });
  });
});
