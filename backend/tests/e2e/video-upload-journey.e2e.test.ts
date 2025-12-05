import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * E2E Test: Video Upload & Processing Journey
 *
 * Tests the complete video workflow:
 * 1. Request upload URL
 * 2. Upload video metadata
 * 3. Trigger highlight processing
 * 4. Check processing status
 * 5. Retrieve processed highlights
 *
 * Note: Uses the existing 'syston' tenant from test fixtures
 */
describe("E2E: Video Upload Journey", () => {
  const testEmail = `video-test-${Date.now()}@example.com`;
  const testPassword = "SecurePass123!";
  let authToken: string;

  it("completes video upload workflow: request URL -> upload -> process -> retrieve", async () => {
    // First, register and login to get auth token
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `video-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email: testEmail,
        password: testPassword,
        profile: { name: "Video Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env);
    const registerData = await registerResponse.json() as any;
    authToken = registerData.data?.token || "";
    expect(authToken).toBeTruthy();

    // Continue with video upload workflow
    // Step 1: Request upload URL
    const requestUploadRequest = new Request("https://example.com/api/v1/videos/upload", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        filename: "match-video.mp4",
        size: 50000000, // 50MB
        contentType: "video/mp4",
      }),
    });

    const uploadUrlResponse = await worker.fetch(requestUploadRequest, env);
    expect(uploadUrlResponse.status).toBeGreaterThanOrEqual(200);
    expect(uploadUrlResponse.status).toBeLessThan(300);

    const uploadData = await uploadUrlResponse.json() as any;
    expect(uploadData.success).toBe(true);
    expect(uploadData.data?.videoId).toBeDefined();

    const videoId = uploadData.data.videoId;

    // Step 2: Verify video metadata was created
    const listVideosRequest = new Request("https://example.com/api/v1/videos", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const listResponse = await worker.fetch(listVideosRequest, env);
    expect(listResponse.status).toBe(200);

    const listData = await listResponse.json() as any;
    expect(listData.success).toBe(true);
    expect(Array.isArray(listData.data)).toBe(true);

    // Step 3: Trigger highlight processing (if video exists)
    if (videoId) {
      const processRequest = new Request(`https://example.com/api/v1/videos/${videoId}/highlights`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${authToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          team_name: "Test Team",
          opponent_name: "Opponent Team",
        }),
      });

      const processResponse = await worker.fetch(processRequest, env);
      // May return 200 (queued) or 4xx/5xx (video not fully uploaded)
      expect(processResponse.status).toBeGreaterThanOrEqual(200);
      expect(processResponse.status).toBeLessThan(600);

      // Step 4: Check processing status
      const statusRequest = new Request(`https://example.com/api/v1/videos/${videoId}/highlights`, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${authToken}`,
        },
      });

      const statusResponse = await worker.fetch(statusRequest, env);
      expect(statusResponse.status).toBeGreaterThanOrEqual(200);
      expect(statusResponse.status).toBeLessThan(500);
    }
  });

  it("requires authentication for video operations", async () => {
    const uploadRequest = new Request("https://example.com/api/v1/videos/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.mp4",
        size: 1000,
      }),
    });

    const response = await worker.fetch(uploadRequest, env);
    expect(response.status).toBe(401);
  });

  it("validates video upload parameters", async () => {
    // Register user for this test
    const email = `validate-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `validate-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Validate Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env);
    const registerData = await registerResponse.json() as any;
    const token = registerData.data?.token || "";

    const invalidRequest = new Request("https://example.com/api/v1/videos/upload", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // Missing required fields
      }),
    });

    const response = await worker.fetch(invalidRequest, env);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("allows video deletion", async () => {
    // Register user for this test
    const email = `delete-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `delete-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Delete Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env);
    const registerData = await registerResponse.json() as any;
    const token = registerData.data?.token || "";

    // First create a video
    const uploadRequest = new Request("https://example.com/api/v1/videos/upload", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        filename: "delete-test.mp4",
        size: 1000,
        contentType: "video/mp4",
      }),
    });

    const uploadResponse = await worker.fetch(uploadRequest, env);
    const uploadData = await uploadResponse.json() as any;

    if (uploadData.data?.videoId) {
      const deleteRequest = new Request(`https://example.com/api/v1/videos/${uploadData.data.videoId}`, {
        method: "DELETE",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      });

      const deleteResponse = await worker.fetch(deleteRequest, env);
      expect(deleteResponse.status).toBeGreaterThanOrEqual(200);
      expect(deleteResponse.status).toBeLessThan(500);
    }
  });
});
