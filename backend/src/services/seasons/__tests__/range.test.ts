import { describe, it, expect } from "vitest";
import { withClubSeasons } from "../range";

describe("seasons once a club sets up its own", () => {
  it("keeps the football years before the first club season", () => {
    const out = withClubSeasons([{ id: "s1", name: "2026/27", start_date: "2026-08-01", end_date: null, is_current: 1 }], 2023, "2026-10-06");
    expect(out.map((o) => [o.id, o.from, o.to, o.current])).toEqual([
      ["s1", "2026-08-01", "9999-12-31", true],
      ["2025-26", "2025-08-01", "2026-07-31", false],
      ["2024-25", "2024-08-01", "2025-07-31", false],
      ["2023-24", "2023-08-01", "2024-07-31", false],
    ]);
  });

  it("stops a year that runs into the first club season the day before it", () => {
    const out = withClubSeasons([{ id: "s1", name: "Summer", start_date: "2026-06-01", end_date: null, is_current: 1 }], 2025, "2026-10-06");
    expect(out.map((o) => [o.id, o.from, o.to])).toEqual([["s1", "2026-06-01", "9999-12-31"], ["2025-26", "2025-08-01", "2026-05-31"]]);
  });
});
