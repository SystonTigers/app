import { describe, it, expect, beforeEach } from "vitest";
import { createTeam, getTeam, listTeams, type Team } from "../teams";

/**
 * Teams Service Tests
 *
 * Tests team management functions including creation, retrieval, and listing.
 */
describe("Teams Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") {
            try {
              return JSON.parse(value);
            } catch {
              return null;
            }
          }
          return value;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
        list: async (options?: any) => {
          const keys = Array.from(mockKV.keys());
          const filtered = options?.prefix
            ? keys.filter((k) => k.startsWith(options.prefix))
            : keys;
          const limited = options?.limit
            ? filtered.slice(0, options.limit)
            : filtered;
          return {
            keys: limited.map((name) => ({ name })),
          };
        },
      },
    };
  });

  describe("createTeam()", () => {
    it("successfully creates a new team with all required fields", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Under 15s",
      });

      expect(result.tenantId).toBe("syston");
      expect(result.teamId).toBe("u15");
      expect(result.name).toBe("Under 15s");
      expect(result.coaches).toEqual([]);
      expect(result.createdAt).toBeTruthy();
      expect(typeof result.createdAt).toBe("number");

      // Verify it was stored in KV
      const stored = mockKV.get("teams/syston/u15");
      expect(stored).toBeTruthy();
    });

    it("creates team with optional ageGroup field", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u16",
        name: "Under 16s",
        ageGroup: "U16",
      });

      expect(result.ageGroup).toBe("U16");
    });

    it("creates team without ageGroup field", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "seniors",
        name: "Seniors",
      });

      expect(result.ageGroup).toBeUndefined();
    });

    it("initializes coaches as empty array", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u18",
        name: "Under 18s",
      });

      expect(result.coaches).toEqual([]);
      expect(Array.isArray(result.coaches)).toBe(true);
    });

    it("sets createdAt timestamp", async () => {
      const before = Date.now();
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "test",
        name: "Test Team",
      });
      const after = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });

    it("returns existing team if already exists", async () => {
      // Create team first time
      const first = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "existing",
        name: "Original Name",
      });

      // Try to create again with different name
      const second = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "existing",
        name: "New Name",
      });

      // Should return the original team, not create a new one
      expect(second.name).toBe("Original Name");
      expect(second.createdAt).toBe(first.createdAt);
    });

    it("creates teams with same ID in different tenants", async () => {
      const team1 = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Syston U15",
      });

      const team2 = await createTeam(mockEnv, {
        tenant: "kingsthorpe",
        teamId: "u15",
        name: "Kingsthorpe U15",
      });

      expect(team1.name).toBe("Syston U15");
      expect(team2.name).toBe("Kingsthorpe U15");
      expect(team1.tenantId).toBe("syston");
      expect(team2.tenantId).toBe("kingsthorpe");
    });

    it("throws error when tenant is missing", async () => {
      await expect(
        createTeam(mockEnv, {
          tenant: "",
          teamId: "test",
          name: "Test Team",
        })
      ).rejects.toThrow();
    });

    it("throws error when teamId is missing", async () => {
      await expect(
        createTeam(mockEnv, {
          tenant: "syston",
          teamId: "",
          name: "Test Team",
        })
      ).rejects.toThrow();
    });

    it("throws error when name is missing", async () => {
      await expect(
        createTeam(mockEnv, {
          tenant: "syston",
          teamId: "test",
          name: "",
        })
      ).rejects.toThrow();
    });

    it("handles special characters in teamId", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "team-with-dashes_and_underscores",
        name: "Special Team",
      });

      expect(result.teamId).toBe("team-with-dashes_and_underscores");
    });

    it("handles special characters in team name", async () => {
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "special",
        name: "Team with 'quotes' & <tags>",
      });

      expect(result.name).toBe("Team with 'quotes' & <tags>");
    });
  });

  describe("getTeam()", () => {
    it("retrieves an existing team", async () => {
      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Under 15s",
        ageGroup: "U15",
      });

      const result = await getTeam(mockEnv, "syston", "u15");

      expect(result).not.toBeNull();
      expect(result?.teamId).toBe("u15");
      expect(result?.name).toBe("Under 15s");
      expect(result?.ageGroup).toBe("U15");
    });

    it("returns null for non-existent team", async () => {
      const result = await getTeam(mockEnv, "syston", "nonexistent");

      expect(result).toBeNull();
    });

    it("returns null when tenant does not match", async () => {
      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Syston U15",
      });

      // Try to get from different tenant
      const result = await getTeam(mockEnv, "kingsthorpe", "u15");

      expect(result).toBeNull();
    });

    it("retrieves team with all fields", async () => {
      const created = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "complete",
        name: "Complete Team",
        ageGroup: "U16",
      });

      const retrieved = await getTeam(mockEnv, "syston", "complete");

      expect(retrieved?.tenantId).toBe(created.tenantId);
      expect(retrieved?.teamId).toBe(created.teamId);
      expect(retrieved?.name).toBe(created.name);
      expect(retrieved?.ageGroup).toBe(created.ageGroup);
      expect(retrieved?.coaches).toEqual(created.coaches);
      expect(retrieved?.createdAt).toBe(created.createdAt);
    });
  });

  describe("listTeams()", () => {
    it("returns empty array when no teams exist", async () => {
      const result = await listTeams(mockEnv, "syston");

      expect(result).toEqual([]);
    });

    it("lists all teams for a tenant", async () => {
      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Under 15s",
      });

      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u16",
        name: "Under 16s",
      });

      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "seniors",
        name: "Seniors",
      });

      const result = await listTeams(mockEnv, "syston");

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.teamId)).toContain("u15");
      expect(result.map((t) => t.teamId)).toContain("u16");
      expect(result.map((t) => t.teamId)).toContain("seniors");
    });

    it("isolates teams by tenant", async () => {
      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Syston U15",
      });

      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u16",
        name: "Syston U16",
      });

      await createTeam(mockEnv, {
        tenant: "kingsthorpe",
        teamId: "u15",
        name: "Kingsthorpe U15",
      });

      const systonTeams = await listTeams(mockEnv, "syston");
      const kingsthorpeTeams = await listTeams(mockEnv, "kingsthorpe");

      expect(systonTeams).toHaveLength(2);
      expect(kingsthorpeTeams).toHaveLength(1);
      expect(systonTeams.every((t) => t.tenantId === "syston")).toBe(true);
      expect(kingsthorpeTeams.every((t) => t.tenantId === "kingsthorpe")).toBe(true);
    });

    it("returns teams with all fields", async () => {
      await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        name: "Under 15s",
        ageGroup: "U15",
      });

      const result = await listTeams(mockEnv, "syston");

      expect(result[0]).toHaveProperty("tenantId");
      expect(result[0]).toHaveProperty("teamId");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("ageGroup");
      expect(result[0]).toHaveProperty("coaches");
      expect(result[0]).toHaveProperty("createdAt");
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles long team names", async () => {
      const longName = "a".repeat(500);
      const result = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "long",
        name: longName,
      });

      expect(result.name).toBe(longName);
    });

    it("preserves team data through get and list", async () => {
      const created = await createTeam(mockEnv, {
        tenant: "syston",
        teamId: "test",
        name: "Test Team",
        ageGroup: "U15",
      });

      const retrieved = await getTeam(mockEnv, "syston", "test");
      const listed = await listTeams(mockEnv, "syston");

      expect(retrieved).toEqual(created);
      expect(listed[0]).toEqual(created);
    });

    it("handles multiple tenants with multiple teams", async () => {
      // Create teams for multiple tenants
      await createTeam(mockEnv, { tenant: "syston", teamId: "u15", name: "Syston U15" });
      await createTeam(mockEnv, { tenant: "syston", teamId: "u16", name: "Syston U16" });
      await createTeam(mockEnv, { tenant: "kingsthorpe", teamId: "u15", name: "Kingsthorpe U15" });
      await createTeam(mockEnv, { tenant: "kingsthorpe", teamId: "seniors", name: "Kingsthorpe Seniors" });

      const systonTeams = await listTeams(mockEnv, "syston");
      const kingsthorpeTeams = await listTeams(mockEnv, "kingsthorpe");

      expect(systonTeams).toHaveLength(2);
      expect(kingsthorpeTeams).toHaveLength(2);
      expect(systonTeams.map((t) => t.name)).toEqual(["Syston U15", "Syston U16"]);
      expect(kingsthorpeTeams.map((t) => t.name)).toEqual(["Kingsthorpe U15", "Kingsthorpe Seniors"]);
    });
  });
});
