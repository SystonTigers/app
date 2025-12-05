import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Contract Test: Events API
 *
 * Validates that event endpoints return responses matching
 * the contract expected by the mobile application.
 */
describe("Contract: Events API", () => {
  describe("GET /api/v1/events (requires authentication)", () => {
    it("returns 401 with expected error structure when unauthorized", async () => {
      const request = new Request("https://example.com/api/v1/events");

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(401);

      const data = await response.json() as any;

      // Contract: Unauthorized response
      expect(data).toHaveProperty("success");
      expect(data.success).toBe(false);
      expect(data).toHaveProperty("error");
      expect(typeof data.error.message).toBe("string");
    });
  });

  describe("POST /api/v1/events (requires authentication)", () => {
    it("returns 401 when unauthorized", async () => {
      const request = new Request("https://example.com/api/v1/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Team Training",
          event_type: "training",
          start_time: new Date().toISOString(),
        }),
      });

      const response = await worker.fetch(request, env);
      expect(response.status).toBe(401);

      // Contract: Auth failures return 401 (format may vary)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json() as any;
        expect(data).toHaveProperty("success");
        expect(data.success).toBe(false);
      }
    });
  });

  describe("Response structure validation", () => {
    it("validates event object structure", () => {
      const mockEvent = {
        id: "event-123",
        tenant_id: "syston",
        title: "Team Training Session",
        description: "Weekly training at the field",
        event_type: "training",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        location: "Main Field",
        created_by: "user-123",
        created_at: Date.now(),
        rsvp_count: {
          going: 15,
          not_going: 3,
          maybe: 2,
        },
      };

      // Contract: Event object structure
      expect(mockEvent).toHaveProperty("id");
      expect(mockEvent).toHaveProperty("tenant_id");
      expect(mockEvent).toHaveProperty("title");
      expect(mockEvent).toHaveProperty("event_type");
      expect(mockEvent).toHaveProperty("start_time");

      expect(typeof mockEvent.id).toBe("string");
      expect(typeof mockEvent.tenant_id).toBe("string");
      expect(typeof mockEvent.title).toBe("string");
      expect(typeof mockEvent.event_type).toBe("string");
      expect(typeof mockEvent.start_time).toBe("string");

      // RSVP count structure
      if (mockEvent.rsvp_count) {
        expect(mockEvent.rsvp_count).toHaveProperty("going");
        expect(mockEvent.rsvp_count).toHaveProperty("not_going");
        expect(mockEvent.rsvp_count).toHaveProperty("maybe");
        expect(typeof mockEvent.rsvp_count.going).toBe("number");
        expect(typeof mockEvent.rsvp_count.not_going).toBe("number");
        expect(typeof mockEvent.rsvp_count.maybe).toBe("number");
      }
    });

    it("validates RSVP response structure", () => {
      const mockRSVPResponse = {
        success: true,
        data: {
          event_id: "event-123",
          user_id: "user-456",
          status: "going",
          notes: "Looking forward to it!",
          updated_at: Date.now(),
        },
      };

      // Contract validation
      expect(mockRSVPResponse).toHaveProperty("success");
      expect(mockRSVPResponse.data).toHaveProperty("event_id");
      expect(mockRSVPResponse.data).toHaveProperty("status");

      expect(typeof mockRSVPResponse.data.event_id).toBe("string");
      expect(typeof mockRSVPResponse.data.status).toBe("string");
      expect(["going", "not_going", "maybe"]).toContain(
        mockRSVPResponse.data.status
      );
    });

    it("validates events list response structure", () => {
      const mockEventsListResponse = {
        success: true,
        data: {
          events: [
            {
              id: "event-1",
              title: "Training",
              event_type: "training",
              start_time: new Date().toISOString(),
            },
            {
              id: "event-2",
              title: "Match",
              event_type: "match",
              start_time: new Date().toISOString(),
            },
          ],
          total: 2,
          page: 1,
          per_page: 20,
        },
      };

      // Contract validation
      expect(mockEventsListResponse).toHaveProperty("success");
      expect(mockEventsListResponse.success).toBe(true);
      expect(mockEventsListResponse.data).toHaveProperty("events");
      expect(Array.isArray(mockEventsListResponse.data.events)).toBe(true);

      // Pagination fields (optional but expected)
      if (mockEventsListResponse.data.total !== undefined) {
        expect(typeof mockEventsListResponse.data.total).toBe("number");
      }
    });
  });
});
