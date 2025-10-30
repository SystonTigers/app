import { describe, expect, it } from "vitest";
import { FixtureSyncSchema, normalizeFixtureRow, normalizeResultRow } from "../src/index";

describe("Fixture contract helpers", () => {
  it("requires a tenant identifier", () => {
    const result = FixtureSyncSchema.safeParse({
      fixtures: [
        {
          date: "2025-01-01",
          homeTeam: "Club",
          awayTeam: "Rivals"
        }
      ]
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("tenant");
    }
  });

  it("normalises tenant slug payloads", () => {
    const parsed = FixtureSyncSchema.parse({
      tenantSlug: "club-1",
      fixtures: [
        {
          date: "2025-02-14",
          homeTeam: "Club",
          awayTeam: "Rivals",
          opponent: "Rivals",
          status: "live",
          venue: "Home",
          competition: "League",
          time: "10:00",
          homeScore: "2",
          awayScore: 1
        }
      ]
    });

    expect(parsed.tenantId).toBe("club-1");
    expect(parsed.fixtures).toHaveLength(1);
    expect(parsed.fixtures[0].homeTeam).toBe("Club");
  });

  it("maps fixture rows to SDK shape", () => {
    const row = {
      id: 10,
      fixture_date: "2025-03-01",
      kick_off_time: "09:30",
      status: "LIVE",
      source: "email",
      home_team: "Club",
      away_team: "Rivals",
      home_score: "3",
      away_score: null,
      venue: "Home",
      competition: "Cup"
    };

    const normalized = normalizeFixtureRow(row);
    expect(normalized.id).toBe("10");
    expect(normalized.status).toBe("live");
    expect(normalized.homeScore).toBe(3);
    expect(normalized.awayScore).toBeUndefined();
    expect(normalized.time).toBe("09:30");
  });

  it("maps result rows and merges scorer data", () => {
    const row = {
      id: "res-1",
      match_date: "2025-03-02",
      home_team: "Club",
      away_team: "Rivals",
      home_score: 4,
      away_score: 2,
      venue: "Home",
      competition: "Cup",
      scorers: "Legacy Player",
      home_scorers: '["Player A", "Player B"]',
      away_scorers: '["Player C"]'
    };

    const normalized = normalizeResultRow(row);
    expect(normalized.status).toBe("completed");
    expect(normalized.homeScore).toBe(4);
    expect(normalized.scorers).toEqual(["Player A", "Player B", "Player C"]);
  });
});
