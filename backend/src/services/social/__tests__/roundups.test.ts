import { describe, it, expect } from "vitest";
import { statsRoundupPost } from "../clubPosts";
import { monthEnd, monthLabel } from "../scheduleData";

const brand = { clubName: "Syston Tigers", badgeUrl: null, primaryColor: "#FFD700", secondaryColor: "#000000", sponsorName: null, sponsorLogoUrl: null };

describe("monthly round-ups", () => {
  it("names and ends months", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(monthEnd("2026-09-01")).toBe("2026-09-30");
    expect(monthEnd("2028-02-10")).toBe("2028-02-29");
    expect(monthEnd("2026-12-31")).toBe("2026-12-31");
  });

  it("ranks top scorers, shares joint places and uses the club's name style", () => {
    const { caption, graphic } = statsRoundupPost(brand, { style: "first_initial", photos: false }, "2026/27", [
      { name: "Sam Smith", goals: 5, assists: 1, appearances: 6 },
      { name: "Will Jones", goals: 5, assists: 1, appearances: 4 },
      { name: "Alfie Brown", goals: 2, assists: 4, appearances: 7 },
      { name: "No Goals", goals: 0, assists: 6, appearances: 7 },
    ]);
    expect(graphic).toMatchObject({ layout: "leaders", kind: "stats_roundup", headline: "TOP SCORERS", subtitle: "2026/27 so far", columns: ["GOALS", "ASSISTS", "APPS"] });
    expect((graphic as { rows: unknown[] }).rows).toEqual([
      { rank: 1, name: "Will J.", values: [5, 1, 4] },
      { rank: 1, name: "Sam S.", values: [5, 1, 6] },
      { rank: 3, name: "Alfie B.", values: [2, 4, 7] },
    ]);
    expect(caption).toBe("⚽ Top scorers, 2026/27 so far\n1. Will J.: 5 goals, 1 assist\n1. Sam S.: 5 goals, 1 assist\n3. Alfie B.: 2 goals, 4 assists");
  });

  it("keeps the top eight", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Player ${String.fromCharCode(65 + i)}`, goals: 12 - i, assists: 0, appearances: 10 }));
    expect((statsRoundupPost(brand, { style: "full", photos: false }, "2026/27", many).graphic as { rows: unknown[] }).rows).toHaveLength(8);
  });

  it("leaves assists out for clubs that don't record them", () => {
    const { caption, graphic } = statsRoundupPost(brand, { style: "full", photos: false }, "2026/27",
      [{ name: "Sam Smith", goals: 4, assists: 2, appearances: 5 }], false);
    const g = graphic as { columns: string[]; rows: Array<{ values: number[] }> };
    expect(g.columns).toEqual(["GOALS", "APPS"]);
    expect(g.rows[0].values).toEqual([4, 5]);
    expect(caption).not.toMatch(/assist/);
  });
});
