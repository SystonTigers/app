import { describe, it, expect } from "vitest";
import { hasRole } from "./auth";

describe("hasRole", () => {
  it("returns true when role is present in roles array", () => {
    const user = { roles: ["viewer", "admin", "tenant_admin"] };
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "tenant_admin")).toBe(true);
  });

  it("returns false when required role is missing", () => {
    const user = { roles: ["viewer"] };
    expect(hasRole(user, "admin")).toBe(false);
  });

  it("handles legacy single role property", () => {
    const user = { role: "admin" };
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "tenant_admin")).toBe(false);
  });
});
