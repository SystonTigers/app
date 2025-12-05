import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Chat Routes", () => {
  it("should require authentication for listing rooms", async () => {
    const request = new Request("https://example.com/api/v1/chat/rooms");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for creating rooms", async () => {
    const request = new Request("https://example.com/api/v1/chat/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test Room",
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for sending messages", async () => {
    const request = new Request("https://example.com/api/v1/chat/test-room/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Hello",
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for getting history", async () => {
    const request = new Request("https://example.com/api/v1/chat/test-room/history");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for typing indicator", async () => {
    const request = new Request("https://example.com/api/v1/chat/test-room/typing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        isTyping: true,
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
