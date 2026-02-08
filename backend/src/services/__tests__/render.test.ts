import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderGraphic, getRenderStatus } from "../render";
import type { Env } from "../../env";

// Mock the WASM module
vi.mock("@resvg/resvg-wasm", () => ({
  default: vi.fn(async () => { }),
  Resvg: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue({
      asPng: vi.fn().mockReturnValue(new Uint8Array([137, 80, 78, 71])), // PNG header
    }),
  })),
}));

// Mock SVG utility functions
vi.mock("../../utils/svg", () => ({
  applyTokens: vi.fn((svg: string, tokens: any) => svg),
  injectFont: vi.fn((svg: string, family: string, name: string, buf: ArrayBuffer, weight: number) => svg),
  fetchAsDataURI: vi.fn(async (url: string) => `data:image/png;base64,mock`),
  applyImageDataURIs: vi.fn((svg: string, imageMap: any) => svg),
}));

describe("Render Service", () => {
  let mockEnv: any;
  let mockR2: Map<string, any>;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockR2 = new Map();
    mockKV = new Map();

    mockEnv = {
      R2: {
        get: vi.fn(async (key: string) => {
          const value = mockR2.get(key);
          if (!value) {return null;}
          return {
            text: async () => value.text,
            arrayBuffer: async () => value.buffer || new ArrayBuffer(0),
          };
        }),
        put: vi.fn(async (key: string, data: any, options?: any) => {
          mockR2.set(key, { data, options });
        }),
      },
      KV: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) {return null;}
          return type === "json" ? JSON.parse(value) : value;
        }),
      },
      RESVG_WASM: {},
    };

    vi.clearAllMocks();
  });

  describe("renderGraphic", () => {
    it("should return error when templateId is missing", async () => {
      const req = {
        json: {
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("templateId");
    });

    it("should return error when size is missing", async () => {
      const req = {
        json: {
          templateId: "matchday",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("size");
    });

    it("should load template SVG and metadata from R2", async () => {
      mockR2.set("templates/matchday.svg", {
        text: "<svg><text>{{TEAM_NAME}}</text></svg>",
      });
      mockR2.set("templates/matchday.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: { TEAM_NAME: "Demo FC" },
          imageTokens: [],
        }),
      });

      const req = {
        json: {
          templateId: "matchday",
          size: "1080x1080",
        },
      };

      await renderGraphic(req, mockEnv as Env);

      expect(mockEnv.R2.get).toHaveBeenCalledWith("templates/matchday.svg");
      expect(mockEnv.R2.get).toHaveBeenCalledWith("templates/matchday.json");
    });

    it("should return error for unsupported size", async () => {
      mockR2.set("templates/matchday.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/matchday.json", {
        text: JSON.stringify({
          sizes: ["1080x1080", "1920x1080"],
          defaults: {},
        }),
      });

      const req = {
        json: {
          templateId: "matchday",
          size: "640x480", // Not in supported sizes
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("Unsupported size");
    });

    it("should merge tokens from defaults, theme, and data", async () => {
      const { applyTokens } = await import("../../utils/svg");

      mockR2.set("templates/birthday.svg", {
        text: "<svg><text>{{PLAYER_NAME}}</text></svg>",
      });
      mockR2.set("templates/birthday.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: { PLAYER_NAME: "John Doe", COLOR: "blue" },
          imageTokens: [],
        }),
      });

      const req = {
        json: {
          templateId: "birthday",
          size: "1080x1080",
          theme: { COLOR: "red" },
          data: { PLAYER_NAME: "Jane Smith" },
        },
      };

      await renderGraphic(req, mockEnv as Env);

      expect(applyTokens).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          PLAYER_NAME: "Jane Smith", // data overrides defaults
          COLOR: "red", // theme overrides defaults
        })
      );
    });

    it("should handle image tokens and create data URIs", async () => {
      const { fetchAsDataURI } = await import("../../utils/svg");

      mockR2.set("templates/player.svg", {
        text: "<svg><image href='{{PLAYER_IMG_DATAURI}}'/></svg>",
      });
      mockR2.set("templates/player.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
          imageTokens: ["PLAYER_IMG"],
        }),
      });

      const req = {
        json: {
          templateId: "player",
          size: "1080x1080",
          assets: { PLAYER_IMG: "https://example.com/player.jpg" },
        },
      };

      await renderGraphic(req, mockEnv as Env);

      expect(fetchAsDataURI).toHaveBeenCalledWith("https://example.com/player.jpg");
    });

    it("should embed fonts from R2", async () => {
      const { injectFont } = await import("../../utils/svg");

      mockR2.set("templates/quote.svg", {
        text: "<svg><text>Quote</text></svg>",
      });
      mockR2.set("templates/quote.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
          fonts: [
            {
              family: "Roboto",
              files: [
                { name: "Roboto-Regular", path: "roboto/regular.ttf", weight: 400 },
                { name: "Roboto-Bold", path: "roboto/bold.ttf", weight: 700 },
              ],
            },
          ],
        }),
      });
      mockR2.set("fonts/roboto/regular.ttf", {
        buffer: new ArrayBuffer(100),
      });
      mockR2.set("fonts/roboto/bold.ttf", {
        buffer: new ArrayBuffer(100),
      });

      const req = {
        json: {
          templateId: "quote",
          size: "1080x1080",
        },
      };

      await renderGraphic(req, mockEnv as Env);

      expect(injectFont).toHaveBeenCalledWith(
        expect.any(String),
        "Roboto",
        "Roboto-Regular",
        expect.any(ArrayBuffer),
        400
      );
      expect(injectFont).toHaveBeenCalledWith(
        expect.any(String),
        "Roboto",
        "Roboto-Bold",
        expect.any(ArrayBuffer),
        700
      );
    });

    it("should save rendered PNG to R2 with correct metadata", async () => {
      mockR2.set("templates/simple.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/simple.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
        }),
      });

      const req = {
        json: {
          templateId: "simple",
          size: "1080x1080",
        },
      };

      await renderGraphic(req, mockEnv as Env);

      expect(mockEnv.R2.put).toHaveBeenCalledWith(
        expect.stringMatching(/^renders\/simple\/[a-f0-9-]+\.png$/),
        expect.any(Uint8Array),
        expect.objectContaining({
          httpMetadata: {
            contentType: "image/png",
            cacheControl: "public, max-age=31536000, immutable",
          },
        })
      );
    });

    it("should return render result with id, url, and bytes", async () => {
      mockR2.set("templates/result.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/result.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
        }),
      });

      const req = {
        json: {
          templateId: "result",
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.id).toBeTruthy();
      expect(data.url).toContain("renders/result/");
      expect(data.url).toMatch(/\.png$/);
      expect(data.bytes).toBeGreaterThan(0);
    });

    it("should handle missing template gracefully", async () => {
      // No template in R2

      const req = {
        json: {
          templateId: "nonexistent",
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(500);

      const data = await response.json() as any;
      expect(data.error).toContain("R2 missing");
    });

    it("should handle rendering errors gracefully", async () => {
      mockR2.set("templates/error.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/error.json", {
        text: "invalid json {{{",
      });

      const req = {
        json: {
          templateId: "error",
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(500);

      const data = await response.json() as any;
      expect(data.error).toBeDefined();
    });
  });

  describe("getRenderStatus", () => {
    it("should return render status from KV", async () => {
      const renderData = {
        id: "render_123",
        status: "completed",
        url: "https://cdn.example.com/render.png",
        createdAt: Date.now(),
      };

      mockKV.set("render:demo:render_123", JSON.stringify(renderData));

      const req = {
        url: "https://example.com/renders/render_123",
        tenant: "demo",
      };

      const response = await getRenderStatus(req, mockEnv as Env);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.id).toBe("render_123");
      expect(data.status).toBe("completed");
      expect(data.url).toBe("https://cdn.example.com/render.png");
    });

    it("should return 404 for non-existent render", async () => {
      const req = {
        url: "https://example.com/renders/nonexistent",
        tenant: "demo",
      };

      const response = await getRenderStatus(req, mockEnv as Env);
      expect(response.status).toBe(404);

      const data = await response.json() as any;
      expect(data.error).toBe("Render not found");
    });

    it("should isolate renders by tenant", async () => {
      mockKV.set(
        "render:tenant1:render_123",
        JSON.stringify({ id: "render_123", tenant: "tenant1" })
      );
      mockKV.set(
        "render:tenant2:render_123",
        JSON.stringify({ id: "render_123", tenant: "tenant2" })
      );

      const req1 = {
        url: "https://example.com/renders/render_123",
        tenant: "tenant1",
      };

      const req2 = {
        url: "https://example.com/renders/render_123",
        tenant: "tenant2",
      };

      const response1 = await getRenderStatus(req1, mockEnv as Env);
      const data1 = await response1.json() as any;

      const response2 = await getRenderStatus(req2, mockEnv as Env);
      const data2 = await response2.json() as any;

      expect(data1.tenant).toBe("tenant1");
      expect(data2.tenant).toBe("tenant2");
    });

    it("should extract render_id from URL correctly", async () => {
      mockKV.set(
        "render:demo:abc-def-123",
        JSON.stringify({ id: "abc-def-123" })
      );

      const req = {
        url: "https://example.com/api/v1/renders/abc-def-123",
        tenant: "demo",
      };

      const response = await getRenderStatus(req, mockEnv as Env);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.id).toBe("abc-def-123");
    });
  });

  describe("Edge Cases", () => {
    it("should handle template with no fonts", async () => {
      mockR2.set("templates/nofont.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/nofont.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
          fonts: [], // Empty fonts array
        }),
      });

      const req = {
        json: {
          templateId: "nofont",
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(200);
    });

    it("should handle template with no image tokens", async () => {
      mockR2.set("templates/noimg.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/noimg.json", {
        text: JSON.stringify({
          sizes: ["1080x1080"],
          defaults: {},
          imageTokens: [], // Empty imageTokens array
        }),
      });

      const req = {
        json: {
          templateId: "noimg",
          size: "1080x1080",
        },
      };

      const response = await renderGraphic(req, mockEnv as Env);
      expect(response.status).toBe(200);
    });

    it("should handle multiple supported sizes", async () => {
      mockR2.set("templates/multi.svg", {
        text: "<svg></svg>",
      });
      mockR2.set("templates/multi.json", {
        text: JSON.stringify({
          sizes: ["1080x1080", "1920x1080", "1080x1920"],
          defaults: {},
        }),
      });

      for (const size of ["1080x1080", "1920x1080", "1080x1920"]) {
        const req = {
          json: {
            templateId: "multi",
            size,
          },
        };

        const response = await renderGraphic(req, mockEnv as Env);
        expect(response.status).toBe(200);
      }
    });
  });
});
