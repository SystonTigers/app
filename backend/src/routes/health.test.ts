import { describe, it, expect } from "vitest";

describe("health endpoint", () => {
  it("returns ok status", async () => {
    const response = await fetch("http://localhost/healthz");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ status: "ok" });
    expect(typeof json.ts).toBe("string");
  });
});
