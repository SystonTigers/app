import { describe, it, expect } from "vitest";
import { toIsoDate } from "../fa-scraper";

describe("FA Full-Time dates", () => {
  it("reads UK day-first dates and stores them as yyyy-mm-dd", () => {
    expect(toIsoDate("04/10/2026")).toBe("2026-10-04");
    expect(toIsoDate("4-10-2026")).toBe("2026-10-04");
    expect(toIsoDate("4 October 2026")).toBe("2026-10-04");
    expect(toIsoDate("2026-10-04")).toBe("2026-10-04");
  });

  it("rejects dates that don't exist", () => {
    expect(toIsoDate("31/02/2026")).toBeNull();
    expect(toIsoDate("15:00")).toBeNull();
    expect(toIsoDate("4 Octember 2026")).toBeNull();
  });
});
