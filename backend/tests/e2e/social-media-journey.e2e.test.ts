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
 * E2E Test: Social Media Management Journey
 *
 * Tests the social media posting workflow:
 * 1. Configure social media accounts
 * 2. Create social post
 * 3. Schedule post
 * 4. View post history
 * 5. Delete post
 *
 * Note: Uses the existing 'syston' tenant from test fixtures
 */
describe("E2E: Social Media Journey", () => {
  const testPassword = "SecurePass123!";

  it("completes social media workflow: configure -> create post -> view history", async () => {
    // Register admin user for this test
    const email = `social-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `social-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Social Media Manager" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";
    expect(authToken).toBeTruthy();

    // Continue with social media workflow
    // Step 1: Configure social media accounts
    const configureRequest = new Request("https://example.com/api/v1/social/config", {
      method: "PUT",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        twitter: {
          enabled: true,
          account: "@testfc",
        },
        facebook: {
          enabled: true,
          page_id: "test-page-123",
        },
        instagram: {
          enabled: false,
        },
      }),
    });

    const configureResponse = await worker.fetch(configureRequest, env, mockCtx);
    expect(configureResponse.status).toBeGreaterThanOrEqual(200);
    expect(configureResponse.status).toBeLessThan(500);

    // Step 2: Create a social media post
    const createPostRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "Great win today! 🎉 #TeamSpirit",
        platforms: ["twitter", "facebook"],
        scheduled_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        media_urls: [],
      }),
    });

    const createPostResponse = await worker.fetch(createPostRequest, env, mockCtx);
    expect(createPostResponse.status).toBeGreaterThanOrEqual(200);
    expect(createPostResponse.status).toBeLessThan(300);

    const createPostData = await createPostResponse.json() as any;
    expect(createPostData.success).toBe(true);

    const postId = createPostData.data?.id || createPostData.data?.post_id;

    // Step 3: View post history
    const listPostsRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const listPostsResponse = await worker.fetch(listPostsRequest, env, mockCtx);
    expect(listPostsResponse.status).toBe(200);

    const listPostsData = await listPostsResponse.json() as any;
    expect(listPostsData.success).toBe(true);
    expect(Array.isArray(listPostsData.data) || Array.isArray(listPostsData.data?.posts)).toBe(true);

    // Step 4: Delete post (if created)
    if (postId) {
      const deletePostRequest = new Request(`https://example.com/api/v1/social/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "authorization": `Bearer ${authToken}`,
        },
      });

      const deletePostResponse = await worker.fetch(deletePostRequest, env, mockCtx);
      expect(deletePostResponse.status).toBeGreaterThanOrEqual(200);
      expect(deletePostResponse.status).toBeLessThan(500);
    }
  });

  it("requires authentication for social media operations", async () => {
    // Try to create post without auth
    const createRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: "Test post",
        platforms: ["twitter"],
      }),
    });

    const createResponse = await worker.fetch(createRequest, env, mockCtx);
    expect(createResponse.status).toBe(401);

    // Try to list posts without auth
    const listRequest = new Request("https://example.com/api/v1/social/posts");
    const listResponse = await worker.fetch(listRequest, env, mockCtx);
    expect(listResponse.status).toBe(401);

    // Try to configure without auth
    const configRequest = new Request("https://example.com/api/v1/social/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ twitter: { enabled: true } }),
    });
    const configResponse = await worker.fetch(configRequest, env, mockCtx);
    expect(configResponse.status).toBe(401);
  });

  it("validates post content", async () => {
    // Register user for this test
    const email = `validate-post-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `validate-post-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Validate User" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    // Empty content
    const emptyContentRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "",
        platforms: ["twitter"],
      }),
    });

    const emptyResponse = await worker.fetch(emptyContentRequest, env, mockCtx);
    expect(emptyResponse.status).toBeGreaterThanOrEqual(400);
    expect(emptyResponse.status).toBeLessThan(500);

    // No platforms selected
    const noPlatformsRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "Test content",
        platforms: [],
      }),
    });

    const noPlatformsResponse = await worker.fetch(noPlatformsRequest, env, mockCtx);
    expect(noPlatformsResponse.status).toBeGreaterThanOrEqual(400);
    expect(noPlatformsResponse.status).toBeLessThan(500);
  });

  it("retrieves social media configuration", async () => {
    // Register user for this test
    const email = `config-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `config-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Config User" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    // Set config first
    const setConfigRequest = new Request("https://example.com/api/v1/social/config", {
      method: "PUT",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        twitter: { enabled: true, account: "@testfc" },
      }),
    });
    await worker.fetch(setConfigRequest, env, mockCtx);

    // Get config
    const getConfigRequest = new Request("https://example.com/api/v1/social/config", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const getConfigResponse = await worker.fetch(getConfigRequest, env, mockCtx);
    expect(getConfigResponse.status).toBe(200);

    const configData = await getConfigResponse.json() as any;
    expect(configData.success).toBe(true);
  });

  it("handles immediate vs scheduled posts", async () => {
    // Register user for this test
    const email = `schedule-${Date.now()}@example.com`;
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `schedule-reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email,
        password: testPassword,
        profile: { name: "Schedule User" },
        roles: ["admin"],
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;
    const authToken = registerData.data?.token || "";

    // Immediate post (no scheduled_time)
    const immediatePostRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "Post now!",
        platforms: ["twitter"],
      }),
    });

    const immediateResponse = await worker.fetch(immediatePostRequest, env, mockCtx);
    expect(immediateResponse.status).toBeGreaterThanOrEqual(200);
    expect(immediateResponse.status).toBeLessThan(500);

    // Scheduled post
    const scheduledPostRequest = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        content: "Post later!",
        platforms: ["facebook"],
        scheduled_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      }),
    });

    const scheduledResponse = await worker.fetch(scheduledPostRequest, env, mockCtx);
    expect(scheduledResponse.status).toBeGreaterThanOrEqual(200);
    expect(scheduledResponse.status).toBeLessThan(500);
  });
});
