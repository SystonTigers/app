/**
 * Journey: a signed-in member changes their password from the app's profile screen.
 */
import { describe, it, expect } from "vitest";
import { call, registerMember, TENANT } from "./helpers";

describe("Change password (POST /api/v1/users/change-password)", () => {
  it("changes the password when the current one is right, and the new one works for login", async () => {
    const { token, email } = await registerMember("pw-change");

    const res = await call("/api/v1/users/change-password", {
      token,
      body: { currentPassword: "SecurePass123!", newPassword: "BrandNewPass456!" },
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);

    const oldLogin = await call("/api/v1/auth/login", { body: { tenant_id: TENANT, email, password: "SecurePass123!" } });
    expect(oldLogin.status).toBe(401);
    const newLogin = await call("/api/v1/auth/login", { body: { tenant_id: TENANT, email, password: "BrandNewPass456!" } });
    expect(newLogin.status).toBe(200);
  });

  it("rejects a wrong current password and keeps the old one", async () => {
    const { token, email } = await registerMember("pw-wrong");

    const res = await call("/api/v1/users/change-password", {
      token,
      body: { currentPassword: "NotMyPassword1", newPassword: "BrandNewPass456!" },
    });
    expect(res.status).toBe(400);
    expect(res.data.error.code).toBe("INVALID_PASSWORD");

    const login = await call("/api/v1/auth/login", { body: { tenant_id: TENANT, email, password: "SecurePass123!" } });
    expect(login.status).toBe(200);
  });

  it("validates the new password", async () => {
    const { token } = await registerMember("pw-short");

    const short = await call("/api/v1/users/change-password", {
      token,
      body: { currentPassword: "SecurePass123!", newPassword: "short" },
    });
    expect(short.status).toBe(400);
    expect(short.data.error.code).toBe("INVALID_REQUEST");

    const same = await call("/api/v1/users/change-password", {
      token,
      body: { currentPassword: "SecurePass123!", newPassword: "SecurePass123!" },
    });
    expect(same.status).toBe(400);

    const missing = await call("/api/v1/users/change-password", { token, body: { newPassword: "BrandNewPass456!" } });
    expect(missing.status).toBe(400);
  });

  it("requires a signed-in user", async () => {
    const res = await call("/api/v1/users/change-password", {
      body: { currentPassword: "SecurePass123!", newPassword: "BrandNewPass456!" },
    });
    expect(res.status).toBe(401);
  });
});
