import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDefaultAutoPostsMatrix,
  getAutoPostsMatrix,
  updateAutoPostsMatrix,
  updatePostTypeConfig,
  togglePostTypeChannel,
  resetAutoPostsMatrix,
  shouldPostToChannel,
  type ChannelKey,
  type PostType,
  type AutoPostConfig,
  type AutoPostsMatrix,
} from "../autoPostsMatrix";

describe("Auto Posts Matrix Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      KV_IDEMP: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) {return null;}
          return type === "json" ? JSON.parse(value) : value;
        }),
        put: vi.fn(async (key: string, value: string) => {
          mockKV.set(key, value);
        }),
      },
    };
    vi.clearAllMocks();
  });

  describe("getDefaultAutoPostsMatrix", () => {
    it("should return default matrix with all 15 post types", () => {
      const matrix = getDefaultAutoPostsMatrix();
      const postTypes: PostType[] = [
        "COUNTDOWN_T3",
        "COUNTDOWN_T2",
        "COUNTDOWN_T1",
        "MATCHDAY",
        "LIVE_UPDATE",
        "HALFTIME",
        "FULLTIME",
        "LEAGUE_FIXTURES",
        "RESULTS_SUMMARY",
        "TABLE_UPDATE",
        "POSTPONEMENT",
        "BIRTHDAY",
        "QUOTE",
        "MOTM_RESULT",
        "HIGHLIGHTS",
      ];

      expect(Object.keys(matrix)).toHaveLength(15);
      postTypes.forEach((type) => {
        expect(matrix[type]).toBeDefined();
      });
    });

    it("should have app channel enabled by default", () => {
      const matrix = getDefaultAutoPostsMatrix();
      Object.values(matrix).forEach((config) => {
        expect(config.channels.app).toBe(true);
      });
    });

    it("should have all other channels disabled by default", () => {
      const matrix = getDefaultAutoPostsMatrix();
      Object.values(matrix).forEach((config) => {
        expect(config.channels.x).toBe(false);
        expect(config.channels.instagram).toBe(false);
        expect(config.channels.facebook).toBe(false);
        expect(config.channels.tiktok).toBe(false);
      });
    });

    it("should have sponsor overlay disabled by default", () => {
      const matrix = getDefaultAutoPostsMatrix();
      Object.values(matrix).forEach((config) => {
        expect(config.sponsorOverlay).toBe(false);
      });
    });

    it("should not have scheduleTime set by default", () => {
      const matrix = getDefaultAutoPostsMatrix();
      Object.values(matrix).forEach((config) => {
        expect(config.scheduleTime).toBeUndefined();
      });
    });
  });

  describe("getAutoPostsMatrix", () => {
    it("should return stored matrix from KV", async () => {
      const customMatrix: AutoPostsMatrix = {
        MATCHDAY: {
          channels: {
            app: true,
            x: true,
            instagram: false,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: true,
        },
      } as any;

      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(customMatrix)
      );

      const result = await getAutoPostsMatrix(mockEnv, "demo");
      expect(result.MATCHDAY.channels.x).toBe(true);
      expect(result.MATCHDAY.sponsorOverlay).toBe(true);
    });

    it("should return default matrix when not in KV", async () => {
      const result = await getAutoPostsMatrix(mockEnv, "demo");
      expect(Object.keys(result)).toHaveLength(15);
      expect(result.MATCHDAY.channels.app).toBe(true);
      expect(result.MATCHDAY.channels.x).toBe(false);
    });

    it("should isolate matrices by tenant", async () => {
      const tenant1Matrix: AutoPostsMatrix = {
        MATCHDAY: {
          channels: {
            app: true,
            x: true,
            instagram: false,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: false,
        },
      } as any;

      const tenant2Matrix: AutoPostsMatrix = {
        MATCHDAY: {
          channels: {
            app: true,
            x: false,
            instagram: true,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: true,
        },
      } as any;

      mockKV.set(
        "tenants:tenant1:auto-posts-matrix",
        JSON.stringify(tenant1Matrix)
      );
      mockKV.set(
        "tenants:tenant2:auto-posts-matrix",
        JSON.stringify(tenant2Matrix)
      );

      const result1 = await getAutoPostsMatrix(mockEnv, "tenant1");
      const result2 = await getAutoPostsMatrix(mockEnv, "tenant2");

      expect(result1.MATCHDAY.channels.x).toBe(true);
      expect(result1.MATCHDAY.channels.instagram).toBe(false);

      expect(result2.MATCHDAY.channels.x).toBe(false);
      expect(result2.MATCHDAY.channels.instagram).toBe(true);
    });
  });

  describe("updateAutoPostsMatrix", () => {
    it("should store matrix in KV", async () => {
      const matrix: AutoPostsMatrix = {
        FULLTIME: {
          channels: {
            app: true,
            x: true,
            instagram: true,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: true,
        },
      } as any;

      await updateAutoPostsMatrix(mockEnv, "demo", matrix);

      expect(mockEnv.KV_IDEMP.put).toHaveBeenCalled();
      const stored = JSON.parse(
        mockKV.get("tenants:demo:auto-posts-matrix")!
      );
      expect(stored.FULLTIME.channels.instagram).toBe(true);
      expect(stored.FULLTIME.sponsorOverlay).toBe(true);
    });

    it("should return the updated matrix", async () => {
      const matrix: AutoPostsMatrix = {
        BIRTHDAY: {
          channels: {
            app: true,
            x: false,
            instagram: false,
            facebook: true,
            tiktok: false,
          },
          sponsorOverlay: false,
        },
      } as any;

      const result = await updateAutoPostsMatrix(mockEnv, "demo", matrix);
      expect(result).toEqual(matrix);
    });
  });

  describe("updatePostTypeConfig", () => {
    it("should update specific post type config", async () => {
      // Initialize with default
      const defaultMatrix = getDefaultAutoPostsMatrix();
      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(defaultMatrix)
      );

      const newConfig: AutoPostConfig = {
        channels: {
          app: true,
          x: true,
          instagram: true,
          facebook: false,
          tiktok: false,
        },
        scheduleTime: "09:00",
        sponsorOverlay: true,
      };

      const result = await updatePostTypeConfig(
        mockEnv,
        "demo",
        "MATCHDAY",
        newConfig
      );

      expect(result.MATCHDAY.channels.instagram).toBe(true);
      expect(result.MATCHDAY.scheduleTime).toBe("09:00");
      expect(result.MATCHDAY.sponsorOverlay).toBe(true);

      // Other post types should remain unchanged
      expect(result.COUNTDOWN_T3.channels.app).toBe(true);
      expect(result.COUNTDOWN_T3.channels.x).toBe(false);
    });

    it("should persist updated config to KV", async () => {
      const defaultMatrix = getDefaultAutoPostsMatrix();
      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(defaultMatrix)
      );

      const newConfig: AutoPostConfig = {
        channels: {
          app: false,
          x: true,
          instagram: false,
          facebook: false,
          tiktok: false,
        },
        sponsorOverlay: false,
      };

      await updatePostTypeConfig(mockEnv, "demo", "HALFTIME", newConfig);

      const stored = JSON.parse(
        mockKV.get("tenants:demo:auto-posts-matrix")!
      );
      expect(stored.HALFTIME.channels.x).toBe(true);
      expect(stored.HALFTIME.channels.app).toBe(false);
    });
  });

  describe("togglePostTypeChannel", () => {
    it("should toggle channel from false to true", async () => {
      const defaultMatrix = getDefaultAutoPostsMatrix();
      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(defaultMatrix)
      );

      const result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "x"
      );

      expect(result.MATCHDAY.channels.x).toBe(true);
    });

    it("should toggle channel from true to false", async () => {
      const defaultMatrix = getDefaultAutoPostsMatrix();
      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(defaultMatrix)
      );

      const result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "app"
      );

      expect(result.MATCHDAY.channels.app).toBe(false);
    });

    it("should create post type if it doesn't exist", async () => {
      // Empty matrix
      mockKV.set("tenants:demo:auto-posts-matrix", JSON.stringify({}));

      const result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "instagram"
      );

      expect(result.MATCHDAY).toBeDefined();
      expect(result.MATCHDAY.channels.instagram).toBe(true);
      expect(result.MATCHDAY.sponsorOverlay).toBe(false);
    });

    it("should toggle multiple times correctly", async () => {
      const defaultMatrix = getDefaultAutoPostsMatrix();
      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(defaultMatrix)
      );

      // First toggle: false -> true
      let result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "facebook"
      );
      expect(result.FULLTIME.channels.facebook).toBe(true);

      // Second toggle: true -> false
      result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "facebook"
      );
      expect(result.FULLTIME.channels.facebook).toBe(false);

      // Third toggle: false -> true
      result = await togglePostTypeChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "facebook"
      );
      expect(result.FULLTIME.channels.facebook).toBe(true);
    });
  });

  describe("resetAutoPostsMatrix", () => {
    it("should reset matrix to defaults", async () => {
      // Set up custom matrix
      const customMatrix: AutoPostsMatrix = {
        MATCHDAY: {
          channels: {
            app: false,
            x: true,
            instagram: true,
            facebook: true,
            tiktok: true,
          },
          sponsorOverlay: true,
        },
      } as any;

      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(customMatrix)
      );

      const result = await resetAutoPostsMatrix(mockEnv, "demo");

      expect(Object.keys(result)).toHaveLength(15);
      expect(result.MATCHDAY.channels.app).toBe(true);
      expect(result.MATCHDAY.channels.x).toBe(false);
      expect(result.MATCHDAY.channels.instagram).toBe(false);
      expect(result.MATCHDAY.sponsorOverlay).toBe(false);
    });

    it("should persist reset to KV", async () => {
      const customMatrix: AutoPostsMatrix = {
        HIGHLIGHTS: {
          channels: {
            app: false,
            x: true,
            instagram: false,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: true,
        },
      } as any;

      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(customMatrix)
      );

      await resetAutoPostsMatrix(mockEnv, "demo");

      const stored = JSON.parse(
        mockKV.get("tenants:demo:auto-posts-matrix")!
      );
      expect(stored.HIGHLIGHTS.channels.app).toBe(true);
      expect(stored.HIGHLIGHTS.channels.x).toBe(false);
      expect(stored.HIGHLIGHTS.sponsorOverlay).toBe(false);
    });
  });

  describe("shouldPostToChannel", () => {
    it("should return true when channel is enabled", async () => {
      const matrix = getDefaultAutoPostsMatrix();
      mockKV.set("tenants:demo:auto-posts-matrix", JSON.stringify(matrix));

      const result = await shouldPostToChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "app"
      );
      expect(result).toBe(true);
    });

    it("should return false when channel is disabled", async () => {
      const matrix = getDefaultAutoPostsMatrix();
      mockKV.set("tenants:demo:auto-posts-matrix", JSON.stringify(matrix));

      const result = await shouldPostToChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "x"
      );
      expect(result).toBe(false);
    });

    it("should return false for non-existent post type", async () => {
      const matrix = getDefaultAutoPostsMatrix();
      mockKV.set("tenants:demo:auto-posts-matrix", JSON.stringify(matrix));

      const result = await shouldPostToChannel(
        mockEnv,
        "demo",
        "NONEXISTENT" as PostType,
        "app"
      );
      expect(result).toBe(false);
    });

    it("should respect custom configurations", async () => {
      const customMatrix: AutoPostsMatrix = {
        FULLTIME: {
          channels: {
            app: true,
            x: true,
            instagram: false,
            facebook: false,
            tiktok: false,
          },
          sponsorOverlay: false,
        },
      } as any;

      mockKV.set(
        "tenants:demo:auto-posts-matrix",
        JSON.stringify(customMatrix)
      );

      const appResult = await shouldPostToChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "app"
      );
      const xResult = await shouldPostToChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "x"
      );
      const instagramResult = await shouldPostToChannel(
        mockEnv,
        "demo",
        "FULLTIME",
        "instagram"
      );

      expect(appResult).toBe(true);
      expect(xResult).toBe(true);
      expect(instagramResult).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle complete configuration lifecycle", async () => {
      // 1. Get default (not in KV yet)
      const initial = await getAutoPostsMatrix(mockEnv, "demo");
      expect(initial.MATCHDAY.channels.x).toBe(false);

      // 2. Toggle a channel
      await togglePostTypeChannel(mockEnv, "demo", "MATCHDAY", "x");

      // 3. Verify toggle persisted
      const afterToggle = await getAutoPostsMatrix(mockEnv, "demo");
      expect(afterToggle.MATCHDAY.channels.x).toBe(true);

      // 4. Update post type config
      const newConfig: AutoPostConfig = {
        channels: {
          app: true,
          x: true,
          instagram: true,
          facebook: false,
          tiktok: false,
        },
        scheduleTime: "10:00",
        sponsorOverlay: true,
      };
      await updatePostTypeConfig(mockEnv, "demo", "MATCHDAY", newConfig);

      // 5. Verify update
      const afterUpdate = await getAutoPostsMatrix(mockEnv, "demo");
      expect(afterUpdate.MATCHDAY.scheduleTime).toBe("10:00");
      expect(afterUpdate.MATCHDAY.sponsorOverlay).toBe(true);

      // 6. Check shouldPostToChannel
      const shouldPost = await shouldPostToChannel(
        mockEnv,
        "demo",
        "MATCHDAY",
        "instagram"
      );
      expect(shouldPost).toBe(true);

      // 7. Reset to defaults
      await resetAutoPostsMatrix(mockEnv, "demo");

      // 8. Verify reset
      const afterReset = await getAutoPostsMatrix(mockEnv, "demo");
      expect(afterReset.MATCHDAY.channels.x).toBe(false);
      expect(afterReset.MATCHDAY.channels.instagram).toBe(false);
      expect(afterReset.MATCHDAY.sponsorOverlay).toBe(false);
      expect(afterReset.MATCHDAY.scheduleTime).toBeUndefined();
    });

    it("should handle all 15 post types consistently", async () => {
      const postTypes: PostType[] = [
        "COUNTDOWN_T3",
        "COUNTDOWN_T2",
        "COUNTDOWN_T1",
        "MATCHDAY",
        "LIVE_UPDATE",
        "HALFTIME",
        "FULLTIME",
        "LEAGUE_FIXTURES",
        "RESULTS_SUMMARY",
        "TABLE_UPDATE",
        "POSTPONEMENT",
        "BIRTHDAY",
        "QUOTE",
        "MOTM_RESULT",
        "HIGHLIGHTS",
      ];

      const matrix = getDefaultAutoPostsMatrix();
      await updateAutoPostsMatrix(mockEnv, "demo", matrix);

      // Toggle each post type's X channel
      for (const postType of postTypes) {
        await togglePostTypeChannel(mockEnv, "demo", postType, "x");
      }

      // Verify all X channels are now enabled
      const result = await getAutoPostsMatrix(mockEnv, "demo");
      for (const postType of postTypes) {
        expect(result[postType].channels.x).toBe(true);
      }
    });

    it("should handle all 5 channels for each post type", async () => {
      const channels: ChannelKey[] = [
        "app",
        "x",
        "instagram",
        "facebook",
        "tiktok",
      ];

      const matrix = getDefaultAutoPostsMatrix();
      await updateAutoPostsMatrix(mockEnv, "demo", matrix);

      // Enable all channels for MATCHDAY
      for (const channel of channels) {
        if (channel !== "app") {
          // app already enabled
          await togglePostTypeChannel(mockEnv, "demo", "MATCHDAY", channel);
        }
      }

      // Verify all channels enabled
      const result = await getAutoPostsMatrix(mockEnv, "demo");
      for (const channel of channels) {
        const shouldPost = await shouldPostToChannel(
          mockEnv,
          "demo",
          "MATCHDAY",
          channel
        );
        expect(shouldPost).toBe(true);
      }
    });
  });
});
