import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLocale } from "../locale";

describe("Locale Service", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe("getLocale", () => {
        it("returns 403 when ALLOW_PUBLIC_APIS is not set", async () => {
            const req = {
                headers: { get: vi.fn().mockReturnValue("1.2.3.4") },
            };
            const env = { ALLOW_PUBLIC_APIS: undefined };

            const response = await getLocale(req, env as any);

            expect(response.status).toBe(403);
            const body = await response.json();
            expect(body.error).toBe("disabled");
        });

        it("returns 403 when ALLOW_PUBLIC_APIS is not '1'", async () => {
            const req = {
                headers: { get: vi.fn().mockReturnValue("1.2.3.4") },
            };
            const env = { ALLOW_PUBLIC_APIS: "0" };

            const response = await getLocale(req, env as any);

            expect(response.status).toBe(403);
            const body = await response.json();
            expect(body.error).toBe("disabled");
        });

        it("fetches locale from ipinfo.io when enabled", async () => {
            const mockLocaleData = {
                ip: "1.2.3.4",
                city: "London",
                region: "England",
                country: "GB",
                timezone: "Europe/London",
            };

            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve(JSON.stringify(mockLocaleData)),
            });

            const req = {
                headers: { get: vi.fn().mockReturnValue("1.2.3.4") },
            };
            const env = { ALLOW_PUBLIC_APIS: "1" };

            const response = await getLocale(req, env as any);

            expect(response.headers.get("content-type")).toBe("application/json");
            expect(global.fetch).toHaveBeenCalledWith("https://ipinfo.io/1.2.3.4/json");
        });

        it("uses cf-connecting-ip header", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = {
                headers: { get: vi.fn().mockReturnValue("8.8.8.8") },
            };
            const env = { ALLOW_PUBLIC_APIS: "1" };

            await getLocale(req, env as any);

            expect(req.headers.get).toHaveBeenCalledWith("cf-connecting-ip");
            expect(global.fetch).toHaveBeenCalledWith("https://ipinfo.io/8.8.8.8/json");
        });

        it("handles empty IP gracefully", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = {
                headers: { get: vi.fn().mockReturnValue(null) },
            };
            const env = { ALLOW_PUBLIC_APIS: "1" };

            await getLocale(req, env as any);

            expect(global.fetch).toHaveBeenCalledWith("https://ipinfo.io//json");
        });

        it("passes through response from ipinfo.io", async () => {
            const mockResponse = '{"ip":"1.2.3.4","country":"US","city":"New York"}';

            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve(mockResponse),
            });

            const req = {
                headers: { get: vi.fn().mockReturnValue("1.2.3.4") },
            };
            const env = { ALLOW_PUBLIC_APIS: "1" };

            const response = await getLocale(req, env as any);
            const body = await response.text();

            expect(body).toBe(mockResponse);
        });

        it("handles IPv6 addresses", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = {
                headers: { get: vi.fn().mockReturnValue("2001:4860:4860::8888") },
            };
            const env = { ALLOW_PUBLIC_APIS: "1" };

            await getLocale(req, env as any);

            expect(global.fetch).toHaveBeenCalledWith(
                "https://ipinfo.io/2001:4860:4860::8888/json"
            );
        });
    });
});
