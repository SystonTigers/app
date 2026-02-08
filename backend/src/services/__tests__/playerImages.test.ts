import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createPlayerImage,
  getPlayerImage,
  listPlayerImages,
  updatePlayerImage,
  deletePlayerImage,
  getPlayerImageUploadUrl,
  type PlayerImage,
} from "../playerImages";

describe("Player Images Service", () => {
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
        delete: vi.fn(async (key: string) => {
          mockKV.delete(key);
        }),
      },
      R2_MEDIA: {
        delete: vi.fn(async () => { }),
      },
    };

    vi.clearAllMocks();
  });

  describe("createPlayerImage", () => {
    it("should create a new player image with all fields", async () => {
      const imageData = {
        playerId: "player_123",
        playerName: "John Doe",
        type: "headshot" as const,
        imageUrl: "https://example.com/image.jpg",
        r2Key: "tenants/demo/player-images/player_123/headshot/img_123.jpg",
        uploadedBy: "admin@example.com",
        metadata: { width: 800, height: 600, aspectRatio: "4:3" },
      };

      const result = await createPlayerImage(mockEnv, "demo", imageData);

      expect(result.id).toBeTruthy();
      expect(result.playerId).toBe("player_123");
      expect(result.playerName).toBe("John Doe");
      expect(result.type).toBe("headshot");
      expect(result.uploadedAt).toBeTruthy();
      expect(result.metadata?.width).toBe(800);
    });

    it("should store image in KV and update index", async () => {
      const imageData = {
        playerId: "player_456",
        playerName: "Jane Smith",
        type: "action" as const,
        r2Key: "tenants/demo/player-images/player_456/action/img_456.jpg",
        uploadedBy: "user@example.com",
        imageUrl: "https://example.com/placeholder-action.jpg",
      };

      const result = await createPlayerImage(mockEnv, "demo", imageData);
      const indexKey = "tenants:demo:player-images:index";
      const index = JSON.parse(mockKV.get(indexKey)!);

      expect(index).toHaveLength(1);
      expect(index[0].id).toBe(result.id);
    });
  });

  describe("getPlayerImage", () => {
    it("should return player image by ID", async () => {
      const image: PlayerImage = {
        id: "img_123",
        playerId: "player_123",
        playerName: "John Doe",
        type: "headshot",
        imageUrl: "https://example.com/image.jpg",
        r2Key: "tenants/demo/player-images/player_123/headshot/img_123.jpg",
        uploadedAt: "2025-01-01T00:00:00.000Z",
        uploadedBy: "admin@example.com",
      };

      mockKV.set("tenants:demo:player-images:img_123", JSON.stringify(image));
      const result = await getPlayerImage(mockEnv, "demo", "img_123");
      expect(result).toEqual(image);
    });

    it("should return null for non-existent image", async () => {
      const result = await getPlayerImage(mockEnv, "demo", "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("listPlayerImages", () => {
    beforeEach(() => {
      const images: PlayerImage[] = [
        { id: "img_1", playerId: "player_1", playerName: "Player One", type: "headshot", r2Key: "key1", imageUrl: "url1", uploadedAt: "2025-01-01", uploadedBy: "admin" },
        { id: "img_2", playerId: "player_1", playerName: "Player One", type: "action", r2Key: "key2", imageUrl: "url2", uploadedAt: "2025-01-02", uploadedBy: "admin" },
        { id: "img_3", playerId: "player_2", playerName: "Player Two", type: "headshot", r2Key: "key3", imageUrl: "url3", uploadedAt: "2025-01-03", uploadedBy: "admin" },
      ];
      mockKV.set("tenants:demo:player-images:index", JSON.stringify(images));
    });

    it("should return all player images", async () => {
      const result = await listPlayerImages(mockEnv, "demo");
      expect(result).toHaveLength(3);
    });

    it("should filter by playerId", async () => {
      const result = await listPlayerImages(mockEnv, "demo", { playerId: "player_1" });
      expect(result).toHaveLength(2);
      expect(result.every(img => img.playerId === "player_1")).toBe(true);
    });

    it("should filter by type", async () => {
      const result = await listPlayerImages(mockEnv, "demo", { type: "headshot" });
      expect(result).toHaveLength(2);
      expect(result.every(img => img.type === "headshot")).toBe(true);
    });

    it("should filter by both playerId and type", async () => {
      const result = await listPlayerImages(mockEnv, "demo", { playerId: "player_1", type: "action" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("img_2");
    });
  });

  describe("updatePlayerImage", () => {
    it("should update an existing player image", async () => {
      const existing: PlayerImage = {
        id: "img_123", playerId: "player_123", playerName: "John Doe", type: "headshot",
        r2Key: "key1", imageUrl: "https://example.com/old.jpg", uploadedAt: "2025-01-01", uploadedBy: "admin",
      };
      mockKV.set("tenants:demo:player-images:img_123", JSON.stringify(existing));
      mockKV.set("tenants:demo:player-images:index", JSON.stringify([existing]));

      const result = await updatePlayerImage(mockEnv, "demo", "img_123", { imageUrl: "https://example.com/new.jpg" });
      expect(result?.imageUrl).toBe("https://example.com/new.jpg");
      expect(result?.playerId).toBe("player_123");
    });

    it("should return null for non-existent image", async () => {
      const result = await updatePlayerImage(mockEnv, "demo", "nonexistent", { imageUrl: "new" });
      expect(result).toBeNull();
    });
  });

  describe("deletePlayerImage", () => {
    it("should delete player image from KV and R2", async () => {
      const image: PlayerImage = {
        id: "img_123", playerId: "player_123", playerName: "John Doe", type: "headshot",
        r2Key: "tenants/demo/player-images/player_123/headshot/img_123.jpg",
        imageUrl: "url", uploadedAt: "2025-01-01", uploadedBy: "admin",
      };
      mockKV.set("tenants:demo:player-images:img_123", JSON.stringify(image));
      mockKV.set("tenants:demo:player-images:index", JSON.stringify([image]));

      const result = await deletePlayerImage(mockEnv, "demo", "img_123");
      expect(result).toBe(true);
      expect(mockEnv.R2_MEDIA.delete).toHaveBeenCalledWith(image.r2Key);
    });

    it("should return false for non-existent image", async () => {
      const result = await deletePlayerImage(mockEnv, "demo", "nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getPlayerImageUploadUrl", () => {
    it("should generate upload URL for headshot", async () => {
      const result = await getPlayerImageUploadUrl(mockEnv, "demo", "player_123", "headshot");
      expect(result.imageId).toBeTruthy();
      expect(result.r2Key).toContain("tenants/demo/player-images/player_123/headshot/");
      expect(result.uploadUrl).toContain("/api/v1/admin/player-images/upload/");
    });

    it("should generate upload URL for action photo", async () => {
      const result = await getPlayerImageUploadUrl(mockEnv, "demo", "player_456", "action");
      expect(result.r2Key).toContain("/action/");
    });
  });

  describe("Edge Cases", () => {
    it("should handle complete image lifecycle", async () => {
      const uploadInfo = await getPlayerImageUploadUrl(mockEnv, "demo", "player_789", "headshot");
      const created = await createPlayerImage(mockEnv, "demo", {
        playerId: "player_789", playerName: "Test Player", type: "headshot",
        r2Key: uploadInfo.r2Key, uploadedBy: "admin@test.com",
        imageUrl: "https://example.com/placeholder.jpg",
      });

      const retrieved = await getPlayerImage(mockEnv, "demo", created.id);
      expect(retrieved).toEqual(created);

      const updated = await updatePlayerImage(mockEnv, "demo", created.id, {
        imageUrl: "https://cdn.example.com/final.jpg",
      });
      expect(updated?.imageUrl).toBe("https://cdn.example.com/final.jpg");

      const deleted = await deletePlayerImage(mockEnv, "demo", created.id);
      expect(deleted).toBe(true);

      const afterDelete = await getPlayerImage(mockEnv, "demo", created.id);
      expect(afterDelete).toBeNull();
    });
  });
});
