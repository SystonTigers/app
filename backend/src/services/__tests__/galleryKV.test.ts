// backend/src/services/__tests__/galleryKV.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  createAlbum,
  listAlbums,
  getUploadUrl,
  uploadBinary,
  commitMedia,
  listMedia,
  getViewUrl,
} from "../galleryKV";

describe("Gallery KV Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockR2: Map<string, { data: ArrayBuffer; contentType: string }>;

  beforeEach(() => {
    mockKV = new Map();
    mockR2 = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") return JSON.parse(value);
          return value;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
        delete: async (key: string) => {
          mockKV.delete(key);
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
      R2_MEDIA: {
        put: async (key: string, data: ArrayBuffer, options?: any) => {
          mockR2.set(key, {
            data,
            contentType: options?.httpMetadata?.contentType || "application/octet-stream",
          });
        },
        get: async (key: string) => {
          return mockR2.get(key) || null;
        },
      },
      GALLERY_ALLOWED: "image/jpeg,image/png,image/webp",
    };
  });

  describe("createAlbum", () => {
    it("creates a new album with required fields", async () => {
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Summer Tournament 2025",
        createdBy: "user-456",
      });

      expect(album).toBeDefined();
      expect(album.albumId).toBeDefined();
      expect(album.tenantId).toBe("tenant-123");
      expect(album.title).toBe("Summer Tournament 2025");
      expect(album.createdBy).toBe("user-456");
      expect(album.createdAt).toBeGreaterThan(0);
    });

    it("creates album with optional teamId", async () => {
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Team Photos",
        teamId: "team-789",
        createdBy: "user-456",
      });

      expect(album.teamId).toBe("team-789");
    });

    it("creates album with optional eventId", async () => {
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Match Day Photos",
        eventId: "event-999",
        createdBy: "user-456",
      });

      expect(album.eventId).toBe("event-999");
    });

    it("creates album with both teamId and eventId", async () => {
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Championship Final",
        teamId: "team-789",
        eventId: "event-999",
        createdBy: "user-456",
      });

      expect(album.teamId).toBe("team-789");
      expect(album.eventId).toBe("event-999");
    });

    it("throws error when tenant is missing", async () => {
      await expect(
        createAlbum(mockEnv, {
          tenant: "",
          title: "Test Album",
          createdBy: "user-456",
        })
      ).rejects.toThrow("tenant + title required");
    });

    it("throws error when title is missing", async () => {
      await expect(
        createAlbum(mockEnv, {
          tenant: "tenant-123",
          title: "",
          createdBy: "user-456",
        })
      ).rejects.toThrow("tenant + title required");
    });

    it("stores album in KV with correct key format", async () => {
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Test Album",
        createdBy: "user-456",
      });

      const key = `gallery/album/tenant-123/${album.albumId}`;
      const stored = mockKV.get(key);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.albumId).toBe(album.albumId);
    });
  });

  describe("listAlbums", () => {
    beforeEach(async () => {
      // Create test albums
      await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Album 1",
        teamId: "team-A",
        createdBy: "user-1",
      });
      await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Album 2",
        teamId: "team-B",
        createdBy: "user-2",
      });
      await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Album 3",
        teamId: "team-A",
        createdBy: "user-3",
      });
      await createAlbum(mockEnv, {
        tenant: "tenant-456",
        title: "Other Tenant Album",
        teamId: "team-C",
        createdBy: "user-4",
      });
    });

    it("lists all albums for a tenant", async () => {
      const albums = await listAlbums(mockEnv, "tenant-123");
      expect(albums.length).toBe(3);
    });

    it("filters albums by teamId", async () => {
      const albums = await listAlbums(mockEnv, "tenant-123", "team-A");
      expect(albums.length).toBe(2);
      expect(albums.every((a) => a.teamId === "team-A")).toBe(true);
    });

    it("returns empty array when no albums exist", async () => {
      const albums = await listAlbums(mockEnv, "tenant-999");
      expect(albums).toEqual([]);
    });

    it("isolates albums by tenant", async () => {
      const tenant123Albums = await listAlbums(mockEnv, "tenant-123");
      const tenant456Albums = await listAlbums(mockEnv, "tenant-456");

      expect(tenant123Albums.length).toBe(3);
      expect(tenant456Albums.length).toBe(1);
    });

    it("returns empty array when filtering by non-existent teamId", async () => {
      const albums = await listAlbums(mockEnv, "tenant-123", "team-NONEXISTENT");
      expect(albums).toEqual([]);
    });
  });

  describe("getUploadUrl", () => {
    it("returns upload info for allowed content type (jpeg)", async () => {
      const result = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        contentType: "image/jpeg",
        uploaderId: "user-789",
      });

      expect(result.r2Key).toBeDefined();
      expect(result.r2Key).toContain("media/tenant-123/album-456/");
      expect(result.uploadVia).toContain("POST /api/v1/gallery/albums/");
    });

    it("returns upload info for allowed content type (png)", async () => {
      const result = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        contentType: "image/png",
        uploaderId: "user-789",
      });

      expect(result.r2Key).toBeDefined();
    });

    it("returns upload info for allowed content type (webp)", async () => {
      const result = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        contentType: "image/webp",
        uploaderId: "user-789",
      });

      expect(result.r2Key).toBeDefined();
    });

    it("throws error for unsupported content type", async () => {
      await expect(
        getUploadUrl(mockEnv, {
          tenant: "tenant-123",
          albumId: "album-456",
          contentType: "image/gif",
          uploaderId: "user-789",
        })
      ).rejects.toThrow("unsupported content-type");
    });

    it("throws error for non-image content type", async () => {
      await expect(
        getUploadUrl(mockEnv, {
          tenant: "tenant-123",
          albumId: "album-456",
          contentType: "application/pdf",
          uploaderId: "user-789",
        })
      ).rejects.toThrow("unsupported content-type");
    });

    it("generates unique r2Keys for each upload request", async () => {
      const result1 = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        contentType: "image/jpeg",
        uploaderId: "user-789",
      });

      const result2 = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        contentType: "image/jpeg",
        uploaderId: "user-789",
      });

      expect(result1.r2Key).not.toBe(result2.r2Key);
    });
  });

  describe("uploadBinary", () => {
    it("uploads file to R2 with correct key", async () => {
      const fileData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer; // JPEG header

      const result = await uploadBinary(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        file: fileData,
        contentType: "image/jpeg",
      });

      expect(result.r2Key).toBeDefined();
      expect(result.r2Key).toContain("media/tenant-123/album-456/");
      expect(mockR2.has(result.r2Key)).toBe(true);
    });

    it("stores content type in R2 metadata", async () => {
      const fileData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer; // PNG header

      const result = await uploadBinary(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        file: fileData,
        contentType: "image/png",
      });

      const stored = mockR2.get(result.r2Key);
      expect(stored?.contentType).toBe("image/png");
    });

    it("generates unique keys for multiple uploads", async () => {
      const fileData = new Uint8Array([0, 1, 2, 3]).buffer;

      const result1 = await uploadBinary(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        file: fileData,
        contentType: "image/jpeg",
      });

      const result2 = await uploadBinary(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        file: fileData,
        contentType: "image/jpeg",
      });

      expect(result1.r2Key).not.toBe(result2.r2Key);
    });
  });

  describe("commitMedia", () => {
    it("commits media metadata with required fields", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
      });

      expect(media).toBeDefined();
      expect(media.id).toBeDefined();
      expect(media.r2Key).toBe("media/tenant-123/album-456/12345-abc");
      expect(media.uploaderId).toBe("user-789");
      expect(media.playerTags).toEqual([]);
      expect(media.consentCheck).toBe(false);
      expect(media.ts).toBeGreaterThan(0);
    });

    it("commits media with player tags", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
        playerTags: ["player-1", "player-2", "player-3"],
      });

      expect(media.playerTags).toEqual(["player-1", "player-2", "player-3"]);
    });

    it("commits media with consent check enabled", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
        consentCheck: true,
      });

      expect(media.consentCheck).toBe(true);
    });

    it("defaults consentCheck to false when not provided", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
      });

      expect(media.consentCheck).toBe(false);
    });

    it("defaults playerTags to empty array when not provided", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
      });

      expect(media.playerTags).toEqual([]);
    });

    it("stores media in KV with correct key format", async () => {
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/tenant-123/album-456/12345-abc",
        uploaderId: "user-789",
      });

      const key = `gallery/object/tenant-123/album-456/${media.id}`;
      const stored = mockKV.get(key);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(media.id);
    });
  });

  describe("listMedia", () => {
    beforeEach(async () => {
      // Commit media with different timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/key-3",
        uploaderId: "user-1",
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/key-1",
        uploaderId: "user-2",
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
      await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
        r2Key: "media/key-2",
        uploaderId: "user-3",
      });

      // Different album
      await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-789",
        r2Key: "media/key-4",
        uploaderId: "user-4",
      });

      // Different tenant
      await commitMedia(mockEnv, {
        tenant: "tenant-456",
        albumId: "album-456",
        r2Key: "media/key-5",
        uploaderId: "user-5",
      });
    });

    it("lists media objects in an album", async () => {
      const media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
      });

      expect(media.length).toBe(3);
    });

    it("sorts media by timestamp (oldest first)", async () => {
      const media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
      });

      expect(media.length).toBe(3);
      expect(media[0].r2Key).toBe("media/key-3");
      expect(media[1].r2Key).toBe("media/key-1");
      expect(media[2].r2Key).toBe("media/key-2");

      // Verify timestamps are in ascending order
      for (let i = 1; i < media.length; i++) {
        expect(media[i].ts).toBeGreaterThanOrEqual(media[i - 1].ts);
      }
    });

    it("isolates media by tenant", async () => {
      const tenant123Media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
      });

      const tenant456Media = await listMedia(mockEnv, {
        tenant: "tenant-456",
        albumId: "album-456",
      });

      expect(tenant123Media.length).toBe(3);
      expect(tenant456Media.length).toBe(1);
    });

    it("isolates media by album", async () => {
      const album456Media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-456",
      });

      const album789Media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-789",
      });

      expect(album456Media.length).toBe(3);
      expect(album789Media.length).toBe(1);
    });

    it("returns empty array when album has no media", async () => {
      const media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-999",
      });

      expect(media).toEqual([]);
    });
  });

  describe("getViewUrl", () => {
    it("returns view URL for media file", async () => {
      const result = await getViewUrl(mockEnv, "media/tenant-123/album-456/12345-abc");

      expect(result.url).toBeDefined();
      expect(result.url).toContain("/api/v1/gallery/file");
      expect(result.url).toContain("key=");
    });

    it("encodes r2Key in URL parameter", async () => {
      const result = await getViewUrl(mockEnv, "media/tenant-123/album-456/12345-abc");

      expect(result.url).toContain(encodeURIComponent("media/tenant-123/album-456/12345-abc"));
    });

    it("handles r2Keys with special characters", async () => {
      const r2Key = "media/tenant-123/album-456/file with spaces.jpg";
      const result = await getViewUrl(mockEnv, r2Key);

      expect(result.url).toContain(encodeURIComponent(r2Key));
      expect(result.url).not.toContain(" ");
    });

    it("accepts custom expiry parameter", async () => {
      const result = await getViewUrl(mockEnv, "media/key", 600);

      // The function accepts expiresSec but doesn't use it in the current implementation
      // Test that it doesn't throw
      expect(result.url).toBeDefined();
    });
  });

  describe("Tenant Isolation", () => {
    it("prevents cross-tenant album access", async () => {
      await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Tenant 123 Album",
        createdBy: "user-1",
      });

      const tenant123Albums = await listAlbums(mockEnv, "tenant-123");
      const tenant456Albums = await listAlbums(mockEnv, "tenant-456");

      expect(tenant123Albums.length).toBe(1);
      expect(tenant456Albums.length).toBe(0);
    });

    it("prevents cross-tenant media access", async () => {
      await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-shared",
        r2Key: "media/key-1",
        uploaderId: "user-1",
      });

      const tenant123Media = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: "album-shared",
      });

      const tenant456Media = await listMedia(mockEnv, {
        tenant: "tenant-456",
        albumId: "album-shared",
      });

      expect(tenant123Media.length).toBe(1);
      expect(tenant456Media.length).toBe(0);
    });
  });

  describe("Full Upload Flow", () => {
    it("completes full upload workflow", async () => {
      // Step 1: Create album
      const album = await createAlbum(mockEnv, {
        tenant: "tenant-123",
        title: "Test Album",
        createdBy: "user-123",
      });

      // Step 2: Get upload URL
      const uploadInfo = await getUploadUrl(mockEnv, {
        tenant: "tenant-123",
        albumId: album.albumId,
        contentType: "image/jpeg",
        uploaderId: "user-123",
      });

      // Step 3: Upload binary
      const fileData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;
      const uploadResult = await uploadBinary(mockEnv, {
        tenant: "tenant-123",
        albumId: album.albumId,
        file: fileData,
        contentType: "image/jpeg",
      });

      // Step 4: Commit media
      const media = await commitMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: album.albumId,
        r2Key: uploadResult.r2Key,
        uploaderId: "user-123",
        playerTags: ["player-1"],
        consentCheck: true,
      });

      // Step 5: List media
      const mediaList = await listMedia(mockEnv, {
        tenant: "tenant-123",
        albumId: album.albumId,
      });

      // Step 6: Get view URL
      const viewUrl = await getViewUrl(mockEnv, media.r2Key);

      // Verify entire flow
      expect(album.albumId).toBeDefined();
      expect(uploadInfo.r2Key).toBeDefined();
      expect(uploadResult.r2Key).toBeDefined();
      expect(media.id).toBeDefined();
      expect(media.playerTags).toEqual(["player-1"]);
      expect(media.consentCheck).toBe(true);
      expect(mediaList.length).toBe(1);
      expect(mediaList[0].id).toBe(media.id);
      expect(viewUrl.url).toContain(encodeURIComponent(media.r2Key));
    });
  });
});
