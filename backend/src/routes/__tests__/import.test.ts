import { describe, it, expect, vi } from "vitest";
import {
    handleImportFixtures,
    handleImportResults,
    handleImportPlayers,
    handleImportMatchEvents,
    handleGetImportTemplate,
    handleGetImportStatus,
} from "../import";

// Mock auth service
vi.mock("../../services/auth", () => ({
    requireJWT: vi.fn().mockResolvedValue({
        tenantId: "test-tenant",
        userId: "user123",
        roles: ["admin", "coach"],
    }),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

describe("Import Routes", () => {
    const createMockKV = () => ({
        get: vi.fn().mockResolvedValue([]),
        put: vi.fn().mockResolvedValue(undefined),
    });

    const createMockDb = (results?: any[]) => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: results || [] }),
        }),
    });

    const createMockEnv = (dbResults?: any[]) => ({
        KV_IDEMP: createMockKV(),
        DB: createMockDb(dbResults),
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    const createCSVFormData = (csvContent: string, filename = "test.csv") => {
        const file = new File([csvContent], filename, { type: "text/csv" });
        const formData = new FormData();
        formData.append("file", file);
        return formData;
    };

    describe("handleImportFixtures", () => {
        it("imports valid fixtures CSV", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `date,time,opponent,venue,competition,home_away,status
2024-01-15,14:00,Rival FC,Home Ground,League,home,scheduled
2024-01-22,15:30,United FC,Away Field,Cup,away,scheduled`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/fixtures", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportFixtures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(2);
            expect(body.total).toBe(2);
        });

        it("returns error when no file provided", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const formData = new FormData();
            const req = new Request("https://api.test.com/import/fixtures", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportFixtures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(false);
            expect(body.error).toContain("No file");
        });

        it("returns error for empty CSV", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `date,time,opponent`;
            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/fixtures", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportFixtures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(false);
            expect(body.error).toContain("No valid data");
        });

        it("reports errors for rows missing required fields", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `date,time,opponent,venue
2024-01-15,14:00,Rival FC,Home
,15:00,,Away`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/fixtures", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportFixtures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(1);
            expect(body.errors).toBeDefined();
            expect(body.errors.length).toBeGreaterThan(0);
        });
    });

    describe("handleImportResults", () => {
        it("imports valid results CSV", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `date,opponent,our_score,their_score,venue,competition,scorers
2024-01-08,Old Rivals,3,1,Home Ground,League,John Smith (2); Mike Jones
2024-01-01,United,2,2,Away Field,Cup,`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/results", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportResults(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(2);
        });

        it("handles alternative column names", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `date,opponent,score_for,score_against
2024-01-08,Rivals,3,1`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/results", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportResults(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(1);
        });
    });

    describe("handleImportPlayers", () => {
        it("imports valid players CSV", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `name,number,position,birthday,goals,assists,appearances
John Smith,10,Midfielder,2010-05-15,5,3,12
Mike Jones,7,Forward,2010-08-20,8,2,10`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/players", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportPlayers(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(2);
            expect(env.KV_IDEMP.put).toHaveBeenCalled();
        });

        it("requires player name", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `name,number,position
,10,Midfielder
John Smith,7,Forward`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/players", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportPlayers(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(1);
            expect(body.errors).toBeDefined();
        });

        it("handles alternative column names for stats", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `name,squad_number,position,apps,yellows,reds
John,10,Mid,12,1,0`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/players", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportPlayers(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(1);
        });
    });

    describe("handleImportMatchEvents", () => {
        it("imports match events with player_id", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `fixture_id,player_id,event_type,minute
fix123,player456,goal,45
fix123,player789,assist,45`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/match_events", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportMatchEvents(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(2);
        });

        it("resolves player by name", async () => {
            const players = [
                { id: "player123", name: "John Smith" },
                { id: "player456", name: "Mike Jones" },
            ];
            const env = createMockEnv(players);
            const corsHdrs = createCorsHeaders();

            const csv = `fixture_id,player_name,event_type,minute
fix123,John Smith,goal,23`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/match_events", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportMatchEvents(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(1);
        });

        it("reports error for unknown player name", async () => {
            const env = createMockEnv([]);
            const corsHdrs = createCorsHeaders();

            const csv = `fixture_id,player_name,event_type,minute
fix123,Unknown Player,goal,23`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/match_events", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportMatchEvents(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(0);
            expect(body.errors).toBeDefined();
            expect(body.errors[0]).toContain("Player not found");
        });

        it("requires event_type field", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const csv = `fixture_id,player_id,event_type,minute
fix123,player456,,45`;

            const formData = createCSVFormData(csv);
            const req = new Request("https://api.test.com/import/match_events", {
                method: "POST",
                body: formData,
            });

            const response = await handleImportMatchEvents(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.imported).toBe(0);
            expect(body.errors[0]).toContain("event_type");
        });
    });

    describe("handleGetImportTemplate", () => {
        it("returns fixtures template", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/template/fixtures");

            const response = await handleGetImportTemplate(req, env, corsHdrs, "fixtures");

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe("text/csv");
            expect(response.headers.get("Content-Disposition")).toContain("fixtures_template.csv");

            const text = await response.text();
            expect(text).toContain("date,time,opponent");
        });

        it("returns results template", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/template/results");

            const response = await handleGetImportTemplate(req, env, corsHdrs, "results");

            const text = await response.text();
            expect(text).toContain("our_score,their_score");
        });

        it("returns players template", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/template/players");

            const response = await handleGetImportTemplate(req, env, corsHdrs, "players");

            const text = await response.text();
            expect(text).toContain("name,number,position");
        });

        it("returns match_events template", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/template/match_events");

            const response = await handleGetImportTemplate(req, env, corsHdrs, "match_events");

            const text = await response.text();
            expect(text).toContain("fixture_id,player_name,event_type");
        });

        it("returns error for unknown template type", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/template/unknown");

            const response = await handleGetImportTemplate(req, env, corsHdrs, "unknown");
            const body = await response.json() as any;

            expect(body.success).toBe(false);
            expect(body.error).toContain("Unknown template");
        });
    });

    describe("handleGetImportStatus", () => {
        it("returns counts for all data types", async () => {
            const mockDb = {
                prepare: vi.fn().mockReturnValue({
                    bind: vi.fn().mockReturnThis(),
                    first: vi.fn()
                        .mockResolvedValueOnce({ count: 10 })  // fixtures
                        .mockResolvedValueOnce({ count: 8 })   // results
                        .mockResolvedValueOnce({ count: 15 })  // players
                        .mockResolvedValueOnce({ count: 25 }), // events
                }),
            };
            const env = { DB: mockDb };
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/status");

            const response = await handleGetImportStatus(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.fixtures).toBe(10);
            expect(body.data.results).toBe(8);
            expect(body.data.players).toBe(15);
            expect(body.data.match_events).toBe(25);
        });

        it("returns zero counts when no data exists", async () => {
            const mockDb = {
                prepare: vi.fn().mockReturnValue({
                    bind: vi.fn().mockReturnThis(),
                    first: vi.fn().mockResolvedValue({ count: 0 }),
                }),
            };
            const env = { DB: mockDb };
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/import/status");

            const response = await handleGetImportStatus(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.fixtures).toBe(0);
        });
    });
});
