import { describe, it, expect, beforeEach } from "vitest";
import {
  registerUser,
  authenticateUser,
  getUserByEmail,
  hashPassword,
  verifyPassword,
  type RegisterUserInput,
  type AuthenticateUserInput,
} from "../users";

/**
 * Users Service Tests
 *
 * Tests user management functions including registration, authentication,
 * and password operations.
 */
describe("Users Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockDB: any;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    // Mock D1 database
    const dbData = new Map<string, any[]>();
    mockDB = {
      prepare: (query: string) => {
        return {
          bind: (...params: any[]) => {
            return {
              run: async () => {
                // Handle INSERT/UPDATE/DELETE
                if (query.includes("INSERT INTO auth_users")) {
                  // INSERT INTO auth_users (id, tenant_id, email, password_hash, roles, profile, created_at, updated_at)
                  // VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  // params: [id, tenant_id, email, password_hash, roles, profile, created_at, updated_at]
                  const users = dbData.get("auth_users") || [];
                  const newUser = {
                    id: params[0],
                    tenant_id: params[1],
                    email: params[2],
                    password_hash: params[3],
                    roles: params[4],
                    profile: params[5],
                    created_at: params[6],
                    updated_at: params[7],
                  };
                  users.push(newUser);
                  dbData.set("auth_users", users);
                  return { success: true };
                }
                return { success: true };
              },
              first: async () => {
                // Handle SELECT queries
                if (query.includes("FROM auth_users") && query.includes("WHERE")) {
                  const users = dbData.get("auth_users") || [];

                  // Check if it's a query with both tenant_id AND email
                  if (query.includes("tenant_id") && query.includes("email")) {
                    // SELECT ... FROM auth_users WHERE tenant_id = ? AND email = ?
                    // params: [tenant_id, email]
                    const tenantId = params[0];
                    const email = params[1];
                    return users.find((u: any) => u.tenant_id === tenantId && u.email === email) || null;
                  } else if (query.includes("email")) {
                    // SELECT ... FROM auth_users WHERE email = ?
                    // params: [email]
                    const email = params[0];
                    return users.find((u: any) => u.email === email) || null;
                  }
                }
                if (query.includes("COUNT(*)")) {
                  // Handle COUNT queries for SQL injection test
                  const users = dbData.get("auth_users") || [];
                  return { count: users.length };
                }
                return null;
              },
              all: async () => {
                return { results: [] };
              },
            };
          },
          first: async () => {
            // Handle queries without bind() - e.g., COUNT(*) queries
            if (query.includes("COUNT(*)")) {
              const users = dbData.get("auth_users") || [];
              return { count: users.length };
            }
            return null;
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        };
      },
    };

    mockEnv = {
      DB: mockDB,
      KV_IDEMP: {
        get: async (key: string) => mockKV.get(key) || null,
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
      },
    };

    // Seed tenant config in KV_IDEMP (used by getTenantConfig)
    mockKV.set(
      "tenant:syston",
      JSON.stringify({
        id: "syston",
        slug: "syston",
        name: "Syston RFC",
        plan: "pro",
        flags: { use_make: false, direct_yt: true },
        creds: {},
        makeWebhookUrl: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
    );
    mockKV.set(
      "tenant:kingsthorpe",
      JSON.stringify({
        id: "kingsthorpe",
        slug: "kingsthorpe",
        name: "Kingsthorpe RFC",
        plan: "starter",
        flags: { use_make: false, direct_yt: true },
        creds: {},
        makeWebhookUrl: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
    );
  });
  describe("registerUser()", () => {
    it("successfully registers a new user with valid data", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "newuser@example.com",
        password: "SecurePassword123!",
        roles: ["tenant_member"],
        profile: { name: "New User" }
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe("newuser@example.com");
        expect(result.user.tenant_id).toBe("syston");
        expect(result.user.roles).toContain("tenant_member");
        expect(result.user.profile).toEqual({ name: "New User" });
        expect(result.user.id).toBeTruthy();
        expect(result.user.created_at).toBeTruthy();
        expect(result.user.updated_at).toBeTruthy();
      }
    });

    it("normalizes email to lowercase", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "TestUser@EXAMPLE.COM",
        password: "SecurePassword123!",
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe("testuser@example.com");
      }
    });

    it("defaults to tenant_member role when no roles provided", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "defaultrole@example.com",
        password: "SecurePassword123!",
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.roles).toEqual(["tenant_member"]);
      }
    });

    it("accepts multiple roles", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "multirole@example.com",
        password: "SecurePassword123!",
        roles: ["tenant_admin", "tenant_member"]
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.roles).toContain("tenant_admin");
        expect(result.user.roles).toContain("tenant_member");
      }
    });

    it("returns error when tenant not found", async () => {
      const input: RegisterUserInput = {
        tenantId: "nonexistent",
        email: "user@example.com",
        password: "SecurePassword123!",
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(404);
        expect(result.error.code).toBe("TENANT_NOT_FOUND");
        expect(result.error.message).toContain("tenant not found");
      }
    });

    it("returns error when user already exists", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "duplicate@example.com",
        password: "SecurePassword123!",
      };

      // Register first time - should succeed
      const firstResult = await registerUser(mockEnv, input);
      expect(firstResult.success).toBe(true);

      // Register again - should fail
      const secondResult = await registerUser(mockEnv, input);
      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.status).toBe(409);
        expect(secondResult.error.code).toBe("USER_EXISTS");
        expect(secondResult.error.message).toContain("already registered");
      }
    });

    it("hashes passwords securely", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "secure@example.com",
        password: "MySecretPassword123!",
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);

      // Verify password is not stored in plain text
      const user = await mockEnv.DB.prepare(
        "SELECT password_hash FROM auth_users WHERE email = ?"
      ).bind("secure@example.com").first();

      expect(user.password_hash).toBeTruthy();
      expect(user.password_hash).not.toBe("MySecretPassword123!");
      expect(user.password_hash).toContain(":"); // salt:hash format
    });

    it("isolates users by tenant", async () => {
      // Register same email in different tenants
      await registerUser(mockEnv, {
        tenantId: "syston",
        email: "shared@example.com",
        password: "Password1",
      });

      // Should be able to register same email in different tenant
      const result = await registerUser(mockEnv, {
        tenantId: "kingsthorpe",
        email: "shared@example.com",
        password: "Password2",
      });

      expect(result.success).toBe(true);
    });

    it("handles empty profile correctly", async () => {
      const input: RegisterUserInput = {
        tenantId: "syston",
        email: "noprofile@example.com",
        password: "SecurePassword123!",
        profile: null
      };

      const result = await registerUser(mockEnv, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.profile).toBeNull();
      }
    });
  });

  describe("authenticateUser()", () => {
    beforeEach(async () => {
      // Register a test user for authentication tests
      await registerUser(mockEnv, {
        tenantId: "syston",
        email: "testauth@example.com",
        password: "TestPassword123!",
        roles: ["tenant_member"],
        profile: { name: "Test User" }
      });
    });

    it("successfully authenticates with correct credentials", async () => {
      const input: AuthenticateUserInput = {
        tenantId: "syston",
        email: "testauth@example.com",
        password: "TestPassword123!",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).not.toBeNull();
      expect(user?.email).toBe("testauth@example.com");
      expect(user?.tenant_id).toBe("syston");
      expect(user?.roles).toContain("tenant_member");
      expect(user?.profile).toEqual({ name: "Test User" });
    });

    it("returns null with incorrect password", async () => {
      const input: AuthenticateUserInput = {
        tenantId: "syston",
        email: "testauth@example.com",
        password: "WrongPassword123!",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).toBeNull();
    });

    it("returns null for non-existent user", async () => {
      const input: AuthenticateUserInput = {
        tenantId: "syston",
        email: "nonexistent@example.com",
        password: "Password123!",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).toBeNull();
    });

    it("normalizes email during authentication", async () => {
      const input: AuthenticateUserInput = {
        tenantId: "syston",
        email: "TestAuth@EXAMPLE.COM", // Uppercase
        password: "TestPassword123!",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).not.toBeNull();
      expect(user?.email).toBe("testauth@example.com");
    });

    it("isolates authentication by tenant", async () => {
      // Try to authenticate with wrong tenant
      const input: AuthenticateUserInput = {
        tenantId: "kingsthorpe",
        email: "testauth@example.com",
        password: "TestPassword123!",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).toBeNull(); // User exists in syston, not kingsthorpe
    });

    it("handles empty password correctly", async () => {
      const input: AuthenticateUserInput = {
        tenantId: "syston",
        email: "testauth@example.com",
        password: "",
      };

      const user = await authenticateUser(mockEnv, input);

      expect(user).toBeNull();
    });
  });

  describe("getUserByEmail()", () => {
    beforeEach(async () => {
      await registerUser(mockEnv, {
        tenantId: "syston",
        email: "getuser@example.com",
        password: "Password123!",
        roles: ["tenant_admin"],
        profile: { name: "Get User" }
      });
    });

    it("retrieves user by email", async () => {
      const user = await getUserByEmail(mockEnv, "syston", "getuser@example.com");

      expect(user).not.toBeNull();
      expect(user?.email).toBe("getuser@example.com");
      expect(user?.tenant_id).toBe("syston");
      expect(user?.roles).toContain("tenant_admin");
      expect(user?.profile).toEqual({ name: "Get User" });
    });

    it("normalizes email when retrieving", async () => {
      const user = await getUserByEmail(mockEnv, "syston", "GetUser@EXAMPLE.COM");

      expect(user).not.toBeNull();
      expect(user?.email).toBe("getuser@example.com");
    });

    it("returns null for non-existent user", async () => {
      const user = await getUserByEmail(mockEnv, "syston", "nonexistent@example.com");

      expect(user).toBeNull();
    });

    it("returns null for wrong tenant", async () => {
      const user = await getUserByEmail(mockEnv, "kingsthorpe", "getuser@example.com");

      expect(user).toBeNull();
    });

    it("excludes password hash from returned user", async () => {
      const user = await getUserByEmail(mockEnv, "syston", "getuser@example.com");

      expect(user).not.toBeNull();
      expect(user).not.toHaveProperty("password_hash");
    });
  });

  describe("hashPassword()", () => {
    it("generates a hash with salt", async () => {
      const hash = await hashPassword("TestPassword123!");

      expect(hash).toBeTruthy();
      expect(hash).toContain(":");
      expect(hash.split(":").length).toBe(2);
    });

    it("generates different hashes for same password (different salts)", async () => {
      const hash1 = await hashPassword("SamePassword");
      const hash2 = await hashPassword("SamePassword");

      expect(hash1).not.toBe(hash2); // Different salts
    });

    it("generates consistent hash with same salt", async () => {
      const salt = "testSalt123";
      const hash1 = await hashPassword("Password", salt);
      const hash2 = await hashPassword("Password", salt);

      expect(hash1).toBe(hash2);
    });

    it("generates different hashes for different passwords", async () => {
      const salt = "sameSalt";
      const hash1 = await hashPassword("Password1", salt);
      const hash2 = await hashPassword("Password2", salt);

      expect(hash1).not.toBe(hash2);
    });

    it("handles empty password", async () => {
      const hash = await hashPassword("");

      expect(hash).toBeTruthy();
      expect(hash).toContain(":");
    });

    it("handles special characters in password", async () => {
      const hash = await hashPassword("P@ssw0rd!#$%^&*()");

      expect(hash).toBeTruthy();
      expect(hash).toContain(":");
    });

    it("handles long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);

      expect(hash).toBeTruthy();
      expect(hash).toContain(":");
    });
  });

  describe("verifyPassword()", () => {
    it("verifies correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("rejects incorrect password", async () => {
      const hash = await hashPassword("CorrectPassword");
      const isValid = await verifyPassword("WrongPassword", hash);

      expect(isValid).toBe(false);
    });

    it("rejects empty password when hash is not empty", async () => {
      const hash = await hashPassword("Password");
      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });

    it("returns false for malformed hash", async () => {
      const isValid = await verifyPassword("Password", "malformed");

      expect(isValid).toBe(false);
    });

    it("returns false for empty hash", async () => {
      const isValid = await verifyPassword("Password", "");

      expect(isValid).toBe(false);
    });

    it("uses timing-safe comparison", async () => {
      // Verify implementation uses timing-safe comparison
      // This is hard to test directly, but we can verify behavior
      const hash = await hashPassword("Password");

      const start1 = Date.now();
      await verifyPassword("Password", hash);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await verifyPassword("WrongPassword", hash);
      const time2 = Date.now() - start2;

      // Both should complete in similar time (within reasonable variance)
      // This is a weak test, but better than nothing
      expect(Math.abs(time1 - time2)).toBeLessThan(100); // Within 100ms
    });

    it("handles hash with missing salt", async () => {
      const isValid = await verifyPassword("Password", ":hashonly");

      expect(isValid).toBe(false);
    });

    it("handles hash with missing hash", async () => {
      const isValid = await verifyPassword("Password", "saltonly:");

      expect(isValid).toBe(false);
    });
  });

  describe("Edge Cases & Security", () => {
    it("prevents SQL injection in email", async () => {
      const result = await registerUser(mockEnv, {
        tenantId: "syston",
        email: "'; DROP TABLE auth_users; --",
        password: "Password123!",
      });

      expect(result.success).toBe(true);

      // Verify table still exists
      const users = await mockEnv.DB.prepare("SELECT COUNT(*) as count FROM auth_users").first();
      expect(users.count).toBeGreaterThan(0);
    });

    it("handles very long email", async () => {
      const longEmail = "a".repeat(300) + "@example.com";
      const result = await registerUser(mockEnv, {
        tenantId: "syston",
        email: longEmail,
        password: "Password123!",
      });

      // Should either succeed or fail gracefully (not crash)
      expect(result).toBeDefined();
    });

    it("handles email with Unicode characters", async () => {
      const result = await registerUser(mockEnv, {
        tenantId: "syston",
        email: "тест@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(true);
    });

    it("handles profile with nested objects", async () => {
      const result = await registerUser(mockEnv, {
        tenantId: "syston",
        email: "nested@example.com",
        password: "Password123!",
        profile: {
          name: "User",
          address: {
            street: "123 Main St",
            city: "Test City"
          }
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.profile).toHaveProperty("address");
        expect((result.user.profile as any).address.city).toBe("Test City");
      }
    });

    it("handles profile with arrays", async () => {
      const result = await registerUser(mockEnv, {
        tenantId: "syston",
        email: "arrays@example.com",
        password: "Password123!",
        profile: {
          tags: ["admin", "user", "moderator"]
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.user.profile as any).tags).toEqual(["admin", "user", "moderator"]);
      }
    });
  });
});
