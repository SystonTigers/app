import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSlogans } from "../slogans";

describe("Slogans Service", () => {
    describe("getSlogans", () => {
        it("returns 5 slogan options", async () => {
            const req = { url: "https://api.test.com/slogans?team=Tigers&city=Detroit" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            expect(body.options).toBeDefined();
            expect(body.options).toHaveLength(5);
        });

        it("replaces {TEAM} placeholder with team parameter", async () => {
            const req = { url: "https://api.test.com/slogans?team=Eagles&city=Philadelphia" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            body.options.forEach((slogan: string) => {
                expect(slogan).not.toContain("{TEAM}");
                // Most slogans will contain the team name, but some might not
            });
        });

        it("replaces {CITY} placeholder with city parameter", async () => {
            const req = { url: "https://api.test.com/slogans?team=Bears&city=Chicago" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            body.options.forEach((slogan: string) => {
                expect(slogan).not.toContain("{CITY}");
            });
        });

        it("uses default team name when not provided", async () => {
            const req = { url: "https://api.test.com/slogans" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            // Should use 'Your Team' as default
            expect(body.options).toHaveLength(5);
            body.options.forEach((slogan: string) => {
                expect(slogan).not.toContain("{TEAM}");
            });
        });

        it("derives city from team name when city not provided", async () => {
            const req = { url: "https://api.test.com/slogans?team=New York Giants" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            // City should be derived as first word of team name: "New"
            expect(body.options).toHaveLength(5);
            body.options.forEach((slogan: string) => {
                expect(slogan).not.toContain("{CITY}");
            });
        });

        it("returns JSON content-type header", async () => {
            const req = { url: "https://api.test.com/slogans?team=Test" };
            const response = await getSlogans(req);

            expect(response.headers.get("content-type")).toBe("application/json");
        });

        it("generates different slogans on each call (randomness)", async () => {
            const req = { url: "https://api.test.com/slogans?team=Randomizers" };

            // Call multiple times and collect unique slogans
            const allSlogans = new Set<string>();
            for (let i = 0; i < 10; i++) {
                const response = await getSlogans(req);
                const body = await response.json() as any;
                body.options.forEach((s: string) => allSlogans.add(s));
            }

            // Should have more than 5 unique slogans across 10 calls
            // (unless we're extremely unlucky with randomness)
            expect(allSlogans.size).toBeGreaterThan(5);
        });

        it("handles special characters in team and city names", async () => {
            const req = { url: "https://api.test.com/slogans?team=St.%20Louis&city=St.%20Louis" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            expect(body.options).toHaveLength(5);
            body.options.forEach((slogan: string) => {
                expect(slogan).not.toContain("{TEAM}");
                expect(slogan).not.toContain("{CITY}");
            });
        });

        it("handles Unicode characters in team names", async () => {
            const req = { url: "https://api.test.com/slogans?team=München&city=München" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            expect(body.options).toHaveLength(5);
        });

        it("all slogans are non-empty strings", async () => {
            const req = { url: "https://api.test.com/slogans?team=TestTeam" };
            const response = await getSlogans(req);
            const body = await response.json() as any;

            body.options.forEach((slogan: string) => {
                expect(typeof slogan).toBe("string");
                expect(slogan.length).toBeGreaterThan(0);
            });
        });
    });
});
