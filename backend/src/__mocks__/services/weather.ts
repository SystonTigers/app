/**
 * Mock Weather Service (Open-Meteo)
 *
 * Use this mock in tests to avoid real weather API calls.
 * Import with: vi.mock("../services/weather");
 */

import { vi } from "vitest";

export interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

// Default mock weather data
const defaultWeatherData: WeatherData = {
  hourly: {
    time: [
      "2025-01-01T09:00",
      "2025-01-01T10:00",
      "2025-01-01T11:00",
      "2025-01-01T12:00",
      "2025-01-01T13:00",
      "2025-01-01T14:00",
    ],
    temperature_2m: [12, 14, 15, 16, 17, 16],
    precipitation_probability: [10, 15, 20, 10, 5, 5],
    weathercode: [1, 1, 2, 2, 1, 1],
  },
  daily: {
    time: ["2025-01-01"],
    weathercode: [2],
    temperature_2m_max: [18],
    temperature_2m_min: [8],
    precipitation_sum: [0.5],
  },
};

export const mockGetWeather = vi.fn().mockImplementation(async (req: Request) => {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return new Response(
      JSON.stringify({ error: "Missing coordinates" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      timezone: "Europe/London",
      ...defaultWeatherData,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

export const getWeather = mockGetWeather;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Set up weather mock with custom data
 */
export function mockWeatherData(data: Partial<WeatherData>): void {
  mockGetWeather.mockImplementation(async (req: Request) => {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: "Missing coordinates" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: "Europe/London",
        hourly: { ...defaultWeatherData.hourly, ...data.hourly },
        daily: { ...defaultWeatherData.daily, ...data.daily },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
}

/**
 * Set up weather mock for rainy day
 */
export function mockRainyWeather(): void {
  mockWeatherData({
    hourly: {
      ...defaultWeatherData.hourly,
      precipitation_probability: [80, 85, 90, 85, 80, 75],
      weathercode: [61, 63, 65, 63, 61, 61], // Rain codes
    },
    daily: {
      ...defaultWeatherData.daily,
      weathercode: [63], // Moderate rain
      precipitation_sum: [15],
    },
  });
}

/**
 * Set up weather mock for sunny day
 */
export function mockSunnyWeather(): void {
  mockWeatherData({
    hourly: {
      ...defaultWeatherData.hourly,
      precipitation_probability: [0, 0, 5, 5, 0, 0],
      weathercode: [0, 0, 1, 1, 0, 0], // Clear to partly cloudy
    },
    daily: {
      ...defaultWeatherData.daily,
      weathercode: [0], // Clear sky
      precipitation_sum: [0],
    },
  });
}

/**
 * Set up weather mock to fail
 */
export function mockWeatherFailure(error: string = "Weather API error"): void {
  mockGetWeather.mockImplementation(async () => {
    return new Response(
      JSON.stringify({ error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  });
}

/**
 * Reset weather mock to default behavior
 */
export function resetWeatherMock(): void {
  mockGetWeather.mockReset();
  mockGetWeather.mockImplementation(async (req: Request) => {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: "Missing coordinates" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: "Europe/London",
        ...defaultWeatherData,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
}
