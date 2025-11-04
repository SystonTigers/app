import { describe, it, expect } from "vitest";
import { healthz } from "./health";

describe("health endpoint", () => {
  it("returns ok status", async () => {
    const mockEnv = {
      APP_VERSION: "test-version",
    };
    const response = await healthz(mockEnv);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ status: "ok", version: "test-version" });
    expect(typeof json.ts).toBe("string");
  });
});
