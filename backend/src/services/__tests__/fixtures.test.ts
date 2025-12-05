import { describe, it, expect } from "vitest";
import {
  FixtureSyncSchema,
  normalizeFixtureRow,
  normalizeResultRow,
} from "../fixtures";

describe("Fixtures Service", () => {
  describe("FixtureSyncSchema", () => {
    describe("Validation", () => {
      it("should validate with tenantId", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.tenantId).toBe("demo");
        expect(result.fixtures).toHaveLength(1);
      });

      it("should validate with tenantSlug and convert to tenantId", () => {
        const data = {
          tenantSlug: "demo-fc",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.tenantId).toBe("demo-fc");
      });

      it("should prefer tenantId over tenantSlug when both provided", () => {
        const data = {
          tenantId: "primary-id",
          tenantSlug: "secondary-slug",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.tenantId).toBe("primary-id");
      });

      it("should reject when neither tenantId nor tenantSlug provided", () => {
        const data = {
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
            },
          ],
        };

        expect(() => FixtureSyncSchema.parse(data)).toThrow("tenantId or tenantSlug is required");
      });

      it("should validate fixture with all optional fields", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
              opponent: "Team B",
              status: "scheduled",
              venue: "Stadium A",
              competition: "Premier League",
              time: "15:00",
              homeScore: 2,
              awayScore: 1,
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.fixtures[0].venue).toBe("Stadium A");
        expect(result.fixtures[0].competition).toBe("Premier League");
      });

      it("should accept homeScore and awayScore as strings", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
              homeScore: "3",
              awayScore: "2",
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.fixtures[0].homeScore).toBe("3");
        expect(result.fixtures[0].awayScore).toBe("2");
      });

      it("should accept homeScore and awayScore as numbers", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            {
              date: "2025-01-15",
              homeTeam: "Team A",
              awayTeam: "Team B",
              homeScore: 3,
              awayScore: 2,
            },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.fixtures[0].homeScore).toBe(3);
        expect(result.fixtures[0].awayScore).toBe(2);
      });

      it("should validate multiple fixtures", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            { date: "2025-01-15", homeTeam: "A", awayTeam: "B" },
            { date: "2025-01-16", homeTeam: "C", awayTeam: "D" },
            { date: "2025-01-17", homeTeam: "E", awayTeam: "F" },
          ],
        };

        const result = FixtureSyncSchema.parse(data);
        expect(result.fixtures).toHaveLength(3);
      });

      it("should reject when fixtures array is empty", () => {
        const data = {
          tenantId: "demo",
          fixtures: [],
        };

        // Schema should still validate - empty array is valid
        const result = FixtureSyncSchema.parse(data);
        expect(result.fixtures).toHaveLength(0);
      });

      it("should reject when required fixture fields are missing", () => {
        const data = {
          tenantId: "demo",
          fixtures: [
            {
              date: "2025-01-15",
              // Missing homeTeam and awayTeam
            },
          ],
        };

        expect(() => FixtureSyncSchema.parse(data)).toThrow();
      });
    });
  });

  describe("normalizeFixtureRow", () => {
    it("should normalize complete fixture row", () => {
      const row = {
        id: 123,
        fixture_date: "2025-01-15",
        kick_off_time: "15:00",
        status: "SCHEDULED",
        home_team: "Manchester United",
        away_team: "Liverpool",
        home_score: 2,
        away_score: 1,
        venue: "Old Trafford",
        competition: "Premier League",
      };

      const result = normalizeFixtureRow(row);

      expect(result.id).toBe("123");
      expect(result.date).toBe("2025-01-15");
      expect(result.time).toBe("15:00");
      expect(result.status).toBe("scheduled");
      expect(result.homeTeam).toBe("Manchester United");
      expect(result.awayTeam).toBe("Liverpool");
      expect(result.homeScore).toBe(2);
      expect(result.awayScore).toBe(1);
      expect(result.venue).toBe("Old Trafford");
      expect(result.competition).toBe("Premier League");
    });

    it("should convert status to lowercase", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        status: "COMPLETED",
        home_team: "Team A",
        away_team: "Team B",
      };

      const result = normalizeFixtureRow(row);
      expect(result.status).toBe("completed");
    });

    it("should handle undefined scores", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
      };

      const result = normalizeFixtureRow(row);
      expect(result.homeScore).toBeUndefined();
      expect(result.awayScore).toBeUndefined();
    });

    it("should handle null scores", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: null,
        away_score: null,
      };

      const result = normalizeFixtureRow(row);
      expect(result.homeScore).toBeUndefined();
      expect(result.awayScore).toBeUndefined();
    });

    it("should handle zero scores", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 0,
        away_score: 0,
      };

      const result = normalizeFixtureRow(row);
      expect(result.homeScore).toBeUndefined();
      expect(result.awayScore).toBeUndefined();
    });

    it("should handle string scores", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: "3",
        away_score: "2",
      };

      const result = normalizeFixtureRow(row);
      expect(result.homeScore).toBe(3);
      expect(result.awayScore).toBe(2);
    });

    it("should handle undefined status", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
      };

      const result = normalizeFixtureRow(row);
      expect(result.status).toBeUndefined();
    });

    it("should convert numeric ID to string", () => {
      const row = {
        id: 999,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
      };

      const result = normalizeFixtureRow(row);
      expect(result.id).toBe("999");
      expect(typeof result.id).toBe("string");
    });
  });

  describe("normalizeResultRow", () => {
    it("should normalize complete result row", () => {
      const row = {
        id: 456,
        match_date: "2025-01-15",
        home_team: "Manchester United",
        away_team: "Liverpool",
        home_score: 3,
        away_score: 2,
        venue: "Old Trafford",
        competition: "Premier League",
      };

      const result = normalizeResultRow(row);

      expect(result.id).toBe("456");
      expect(result.date).toBe("2025-01-15");
      expect(result.status).toBe("completed");
      expect(result.homeTeam).toBe("Manchester United");
      expect(result.awayTeam).toBe("Liverpool");
      expect(result.homeScore).toBe(3);
      expect(result.awayScore).toBe(2);
      expect(result.venue).toBe("Old Trafford");
      expect(result.competition).toBe("Premier League");
    });

    it("should always set status to completed", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 1,
        away_score: 1,
      };

      const result = normalizeResultRow(row);
      expect(result.status).toBe("completed");
    });

    it("should parse home_scorers JSON array", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 2,
        away_score: 0,
        home_scorers: JSON.stringify(["Player A", "Player B"]),
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toContain("Player A");
      expect(result.scorers).toContain("Player B");
    });

    it("should parse away_scorers JSON array", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 0,
        away_score: 2,
        away_scorers: JSON.stringify(["Player C", "Player D"]),
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toContain("Player C");
      expect(result.scorers).toContain("Player D");
    });

    it("should combine home and away scorers", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 2,
        away_score: 1,
        home_scorers: JSON.stringify(["Player A", "Player B"]),
        away_scorers: JSON.stringify(["Player C"]),
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toHaveLength(3);
      expect(result.scorers).toContain("Player A");
      expect(result.scorers).toContain("Player B");
      expect(result.scorers).toContain("Player C");
    });

    it("should handle invalid home_scorers JSON gracefully", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 1,
        away_score: 0,
        home_scorers: "invalid json {{{",
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toHaveLength(0);
    });

    it("should handle invalid away_scorers JSON gracefully", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 0,
        away_score: 1,
        away_scorers: "not valid json",
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toHaveLength(0);
    });

    it("should fallback to scorers field if home/away scorers empty", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 1,
        away_score: 0,
        scorers: "Player X",
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toContain("Player X");
    });

    it("should not use fallback scorers if home/away scorers exist", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 1,
        away_score: 0,
        home_scorers: JSON.stringify(["Player A"]),
        scorers: "Fallback Player",
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toContain("Player A");
      expect(result.scorers).not.toContain("Fallback Player");
    });

    it("should sort scorers alphabetically", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 3,
        away_score: 0,
        home_scorers: JSON.stringify(["Zara", "Alice", "Bob"]),
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toEqual(["Alice", "Bob", "Zara"]);
    });

    it("should handle non-array home_scorers JSON", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: 1,
        away_score: 0,
        home_scorers: JSON.stringify({ player: "Not an array" }),
      };

      const result = normalizeResultRow(row);
      expect(result.scorers).toHaveLength(0);
    });

    it("should convert string scores to numbers", () => {
      const row = {
        id: 1,
        match_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        home_score: "4",
        away_score: "3",
      };

      const result = normalizeResultRow(row);
      expect(result.homeScore).toBe(4);
      expect(result.awayScore).toBe(3);
      expect(typeof result.homeScore).toBe("number");
      expect(typeof result.awayScore).toBe("number");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings in fixture row", () => {
      const row = {
        id: 1,
        fixture_date: "",
        home_team: "",
        away_team: "",
        venue: "",
        competition: "",
      };

      const result = normalizeFixtureRow(row);
      expect(result.date).toBe("");
      expect(result.homeTeam).toBe("");
    });

    it("should handle Unicode team names", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "北京国安",
        away_team: "上海申花",
      };

      const result = normalizeFixtureRow(row);
      expect(result.homeTeam).toBe("北京国安");
      expect(result.awayTeam).toBe("上海申花");
    });

    it("should handle special characters in venue names", () => {
      const row = {
        id: 1,
        fixture_date: "2025-01-15",
        home_team: "Team A",
        away_team: "Team B",
        venue: "Stade de l'Étang-de-l'Étang",
      };

      const result = normalizeFixtureRow(row);
      expect(result.venue).toBe("Stade de l'Étang-de-l'Étang");
    });
  });
});
