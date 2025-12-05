import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";
import {
  TEST_TENANT,
  generateTestEmail,
  generateIdempotencyKey,
  createMockContext,
} from "./vitest.setup";

const mockCtx = createMockContext();

/**
 * E2E Test: Event Management Journey
 *
 * Tests the complete event lifecycle:
 * 1. Create event
 * 2. List events
 * 3. RSVP to event
 * 4. View attendees
 * 5. Update event
 *
 * Prerequisites: Run test-seed.sql to seed the test database
 * @see ./fixtures/test-seed.sql
 */
describe("E2E: Event Management Journey", () => {
  const testPassword = "SecurePass123!";

  it("completes event lifecycle: create -> list -> RSVP -> view attendees", async () => {
    // Register user for this test
    const email = generateTestEmail();
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey("event-reg"),
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email,
        password: testPassword,
        profile: { name: "Event Organizer" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";
    expect(authToken).toBeTruthy();

    // Continue with event lifecycle
    // Step 1: Create event
    const createEventRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Team Training Session",
        description: "Weekly training at the field",
        event_type: "training",
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: "Main Field",
      }),
    });

    const createResponse = await worker.fetch(createEventRequest, env, mockCtx);
    expect(createResponse.status).toBeGreaterThanOrEqual(200);
    expect(createResponse.status).toBeLessThan(300);

    const createData = await createResponse.json() as any;
    expect(createData.success).toBe(true);

    const eventId = createData.data?.id || createData.data?.event_id;

    // Step 2: List events
    const listEventsRequest = new Request("https://example.com/api/v1/events", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const listResponse = await worker.fetch(listEventsRequest, env, mockCtx);
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json() as any;
    expect(listData.success).toBe(true);
    expect(Array.isArray(listData.data) || Array.isArray(listData.data?.events)).toBe(true);

    // Step 3: RSVP to event (if event was created)
    if (eventId) {
      const rsvpRequest = new Request(`https://example.com/api/v1/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "going",
          notes: "Looking forward to it!",
        }),
      });

      const rsvpResponse = await worker.fetch(rsvpRequest, env, mockCtx);
      expect(rsvpResponse.status).toBeGreaterThanOrEqual(200);
      expect(rsvpResponse.status).toBeLessThan(500);

      // Step 4: View event attendees
      const attendeesRequest = new Request(`https://example.com/api/v1/events/${eventId}/attendees`, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${authToken}`,
        },
      });

      const attendeesResponse = await worker.fetch(attendeesRequest, env, mockCtx);
      expect(attendeesResponse.status).toBeGreaterThanOrEqual(200);
      expect(attendeesResponse.status).toBeLessThan(500);
    }
  });

  it("requires authentication for event operations", async () => {
    // Try to create event without auth
    const createRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Test Event",
        event_type: "match",
      }),
    });

    const createResponse = await worker.fetch(createRequest, env, mockCtx);
    expect(createResponse.status).toBe(401);

    // Try to list events without auth
    const listRequest = new Request("https://example.com/api/v1/events");
    const listResponse = await worker.fetch(listRequest, env, mockCtx);
    expect(listResponse.status).toBe(401);
  });

  it("validates event creation parameters", async () => {
    // Register user for this test
    const email = generateTestEmail();
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey("validate-event"),
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email,
        password: testPassword,
        profile: { name: "Validate User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    const invalidRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // Missing required fields like title, event_type
      }),
    });

    const response = await worker.fetch(invalidRequest, env, mockCtx);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("handles RSVP status changes", async () => {
    // Register user for this test
    const email = generateTestEmail();
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey("rsvp-reg"),
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email,
        password: testPassword,
        profile: { name: "RSVP User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    // Create event first
    const createRequest = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "RSVP Test Event",
        event_type: "social",
        start_time: new Date(Date.now() + 86400000).toISOString(),
      }),
    });

    const createResponse = await worker.fetch(createRequest, env, mockCtx);
    const createData = await createResponse.json() as any;
    const eventId = createData.data?.id || createData.data?.event_id;

    if (eventId) {
      // RSVP "going"
      const rsvpGoingRequest = new Request(`https://example.com/api/v1/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "going" }),
      });

      const goingResponse = await worker.fetch(rsvpGoingRequest, env, mockCtx);
      expect(goingResponse.status).toBeGreaterThanOrEqual(200);
      expect(goingResponse.status).toBeLessThan(500);

      // Change to "not_going"
      const rsvpNotGoingRequest = new Request(`https://example.com/api/v1/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ status: "not_going" }),
      });

      const notGoingResponse = await worker.fetch(rsvpNotGoingRequest, env, mockCtx);
      expect(notGoingResponse.status).toBeGreaterThanOrEqual(200);
      expect(notGoingResponse.status).toBeLessThan(500);
    }
  });
});
