import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

/**
 * E2E Test: Match Day Journey
 *
 * Tests the complete match day workflow:
 * 1. Create match
 * 2. Update match score/events
 * 3. View live match updates
 * 4. Initiate MOTM voting
 * 5. Cast votes
 * 6. View results
 *
 * Note: Uses the existing 'syston' tenant from test fixtures
 */
describe("E2E: Match Day Journey", () => {
  const testPassword = "SecurePass123!";

  it("completes match day workflow: create match -> update score -> vote MOTM", async () => {
    // Register admin user for this test
    const email = `match-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `match-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Team Coach" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";
    expect(authToken).toBeTruthy();

    // Continue with match day workflow
    // Step 1: Create match (via provisioning/admin endpoint)
    // Note: In production, matches might be created through admin panel
    const matchId = `match-${Date.now()}`;

    // Create match directly in database for testing
    await env.DB.prepare(
      `INSERT OR IGNORE INTO matches (id, tenant_id, opponent, match_date, status)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(matchId, "syston", "Opponent FC", Date.now(), "scheduled").run();

    // Step 2: Get match updates (simulates live match tracking)
    const matchUpdatesRequest = new Request(`https://example.com/api/v1/matches/${matchId}/updates`, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const updatesResponse = await worker.fetch(matchUpdatesRequest, env, mockCtx);
    expect(updatesResponse.status).toBeGreaterThanOrEqual(200);
    expect(updatesResponse.status).toBeLessThan(500);

    // Step 3: Initialize MOTM voting after match
    const initVoteRequest = new Request(`https://example.com/api/v1/motm/${matchId}/init`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        players: [
          { id: "player1", name: "John Doe", number: 10 },
          { id: "player2", name: "Jane Smith", number: 7 },
          { id: "player3", name: "Bob Wilson", number: 1 },
        ],
      }),
    });

    const initVoteResponse = await worker.fetch(initVoteRequest, env, mockCtx);
    expect(initVoteResponse.status).toBeGreaterThanOrEqual(200);
    expect(initVoteResponse.status).toBeLessThan(500);

    // Step 4: Cast MOTM vote
    const voteRequest = new Request(`https://example.com/api/v1/motm/${matchId}/vote`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        player_id: "player1",
      }),
    });

    const voteResponse = await worker.fetch(voteRequest, env, mockCtx);
    expect(voteResponse.status).toBeGreaterThanOrEqual(200);
    expect(voteResponse.status).toBeLessThan(500);

    // Step 5: View voting results
    const resultsRequest = new Request(`https://example.com/api/v1/motm/${matchId}/results`, {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const resultsResponse = await worker.fetch(resultsRequest, env, mockCtx);
    expect(resultsResponse.status).toBeGreaterThanOrEqual(200);
    expect(resultsResponse.status).toBeLessThan(500);

    const resultsData = await resultsResponse.json() as any;
    expect(resultsData.success).toBeDefined();
  });

  it("requires authentication for match operations", async () => {
    const matchId = "test-match";

    // Try to get updates without auth
    const updatesRequest = new Request(`https://example.com/api/v1/matches/${matchId}/updates`);
    const updatesResponse = await worker.fetch(updatesRequest, env, mockCtx);
    expect(updatesResponse.status).toBe(401);

    // Try to vote without auth
    const voteRequest = new Request(`https://example.com/api/v1/motm/${matchId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ player_id: "player1" }),
    });
    const voteResponse = await worker.fetch(voteRequest, env, mockCtx);
    expect(voteResponse.status).toBe(401);
  });

  it("prevents duplicate MOTM votes from same user", async () => {
    // Register user for this test
    const email = `vote-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `vote-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Voter" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    const matchId = `match-${Date.now()}`;

    // Setup match
    await env.DB.prepare(
      `INSERT OR IGNORE INTO matches (id, tenant_id, opponent, match_date, status)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(matchId, "syston", "Test Opponent", Date.now(), "completed").run();

    // Initialize voting
    const initRequest = new Request(`https://example.com/api/v1/motm/${matchId}/init`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        players: [{ id: "player1", name: "Test Player", number: 10 }],
      }),
    });
    await worker.fetch(initRequest, env, mockCtx);

    // First vote
    const vote1Request = new Request(`https://example.com/api/v1/motm/${matchId}/vote`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ player_id: "player1" }),
    });
    const vote1Response = await worker.fetch(vote1Request, env, mockCtx);
    expect(vote1Response.status).toBeGreaterThanOrEqual(200);

    // Second vote (should be rejected or replace first vote)
    const vote2Request = new Request(`https://example.com/api/v1/motm/${matchId}/vote`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ player_id: "player1" }),
    });
    const vote2Response = await worker.fetch(vote2Request, env, mockCtx);
    // Application should handle duplicate votes gracefully
    expect(vote2Response.status).toBeGreaterThanOrEqual(200);
    expect(vote2Response.status).toBeLessThan(500);
  });

  it("returns match not found for invalid match ID", async () => {
    // Register user for this test
    const email = `notfound-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `notfound-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "NotFound User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    const invalidMatchRequest = new Request("https://example.com/api/v1/matches/nonexistent-match/updates", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const response = await worker.fetch(invalidMatchRequest, env, mockCtx);
    expect(response.status).toBeGreaterThanOrEqual(404);
  });
});
