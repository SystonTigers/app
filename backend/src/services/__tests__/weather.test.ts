import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWeather } from "../weather";

describe("Weather Service", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe("getWeather", () => {
        it("returns 400 when lat is missing", async () => {
            const req = { url: "https://api.test.com/weather?lon=1.23" };
            const response = await getWeather(req);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toBe("lat/lon required");
        });

        it("returns 400 when lon is missing", async () => {
            const req = { url: "https://api.test.com/weather?lat=52.5" };
            const response = await getWeather(req);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toBe("lat/lon required");
        });

        it("returns 400 when both lat and lon are missing", async () => {
            const req = { url: "https://api.test.com/weather" };
            const response = await getWeather(req);

            expect(response.status).toBe(400);
            const body = await response.json();
            expect(body.error).toBe("lat/lon required");
        });

        it("fetches weather from Open-Meteo API with valid coordinates", async () => {
            const mockWeatherData = {
                hourly: { temperature_2m: [20, 21, 22] },
                daily: { weathercode: [0] },
            };

            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve(JSON.stringify(mockWeatherData)),
            });

            const req = { url: "https://api.test.com/weather?lat=52.52&lon=13.41" };
            const response = await getWeather(req);

            expect(response.status).toBeUndefined(); // Default status
            expect(response.headers.get("content-type")).toBe("application/json");

            // Verify the API was called with correct URL
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("api.open-meteo.com")
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("latitude=52.52")
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("longitude=13.41")
            );
        });

        it("includes hourly and daily parameters in API request", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = { url: "https://api.test.com/weather?lat=51.5&lon=-0.12" };
            await getWeather(req);

            const fetchUrl = (global.fetch as any).mock.calls[0][0];
            expect(fetchUrl).toContain("hourly=temperature_2m,precipitation_probability");
            expect(fetchUrl).toContain("daily=weathercode,temperature_2m_max,temperature_2m_min");
            expect(fetchUrl).toContain("timezone=auto");
        });

        it("passes through response text from Open-Meteo", async () => {
            const mockResponse = '{"hourly":{"temp":[15]},"current_weather":{"temperature":18}}';

            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve(mockResponse),
            });

            const req = { url: "https://api.test.com/weather?lat=40.7&lon=-74.0" };
            const response = await getWeather(req);
            const body = await response.text();

            expect(body).toBe(mockResponse);
        });

        it("handles negative coordinates", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = { url: "https://api.test.com/weather?lat=-33.87&lon=-151.21" };
            await getWeather(req);

            const fetchUrl = (global.fetch as any).mock.calls[0][0];
            expect(fetchUrl).toContain("latitude=-33.87");
            expect(fetchUrl).toContain("longitude=-151.21");
        });

        it("handles decimal coordinates with various precision", async () => {
            (global.fetch as any).mockResolvedValue({
                text: () => Promise.resolve("{}"),
            });

            const req = { url: "https://api.test.com/weather?lat=51.507351&lon=-0.127758" };
            await getWeather(req);

            const fetchUrl = (global.fetch as any).mock.calls[0][0];
            expect(fetchUrl).toContain("latitude=51.507351");
            expect(fetchUrl).toContain("longitude=-0.127758");
        });
    });
});
