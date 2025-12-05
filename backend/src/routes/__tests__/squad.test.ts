import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleUpdateSquad } from "../squad";

// Mock auth service
vi.mock("../../services/auth", () => ({
    requireJWT: vi.fn().mockResolvedValue({ tenantId: "test-tenant", roles: ["admin"] }),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("Squad Routes", () => {
    const createMockEnv = () => ({
        KV_IDEMP: {
            put: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
        },
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    describe("handleUpdateSquad", () => {
        it("updates squad with valid player array", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();
            const players = [
                { id: "1", name: "John Doe", number: 10, position: "Forward" },
                { id: "2", name: "Jane Smith", number: 1, position: "Goalkeeper" },
            ];

            const req = new Request("https://api.test.com/squad", {
                method: "PUT",
                body: JSON.stringify(players),
            });

            const response = await handleUpdateSquad(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.count).toBe(2);
        });

        it("stores squad data in KV with correct key", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();
            const players = [{ id: "1", name: "Player One" }];

            const req = new Request("https://api.test.com/squad", {
                method: "PUT",
                body: JSON.stringify(players),
            });

            await handleUpdateSquad(req, env, corsHdrs);

            expect(env.KV_IDEMP.put).toHaveBeenCalledWith(
                "squad:test-tenant:list",
                JSON.stringify(players)
            );
        });

        it("returns error for non-array body", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/squad", {
                method: "PUT",
                body: JSON.stringify({ players: [] }), // Object instead of array
            });

            const response = await handleUpdateSquad(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(false);
            expect(body.error).toContain("array");
        });

        it("handles empty player array", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/squad", {
                method: "PUT",
                body: JSON.stringify([]),
            });

            const response = await handleUpdateSquad(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.count).toBe(0);
        });

        it("handles large squad updates", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();
            const largSquad = Array.from({ length: 50 }, (_, i) => ({
                id: String(i),
                name: `Player ${i}`,
                number: i + 1,
            }));

            const req = new Request("https://api.test.com/squad", {
                method: "PUT",
                body: JSON.stringify(largSquad),
            });

            const response = await handleUpdateSquad(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.count).toBe(50);
        });
    });
});
