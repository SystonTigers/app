// backend/src/services/__tests__/matches.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  getNextFixture,
  getLeagueTable,
  upsertLeagueTable,
  createMatch,
  getMatch,
  updateMatch,
  listFixtures,
  createFixture,
  updateFixture,
  deleteFixture,
  listSquad,
  createPlayer,
  updatePlayer,
  deletePlayer,
  listPosts,
  createPost,
} from "../matches";

describe("Matches Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockDB: Map<string, any[]>;

  beforeEach(() => {
    mockKV = new Map();
    mockDB = new Map();

    mockEnv = {
      KV: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") return JSON.parse(value);
          return value;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
        delete: async (key: string) => {
          mockKV.delete(key);
        },
      },
      DB: {
        prepare: (sql: string) => {
          return {
            bind: (...params: any[]) => {
              return {
                first: async () => {
                  const table = mockDB.get("matches") || [];
                  if (sql.includes("SELECT * FROM matches")) {
                    if (sql.includes("date_utc > ?")) {
                      const [teamId, now] = params;
                      const future = table.filter(
                        (m: any) =>
                          m.team_id === teamId &&
                          m.date_utc > now &&
                          m.status === "scheduled"
                      );
                      return future.sort((a: any, b: any) => a.date_utc - b.date_utc)[0] || null;
                    }
                  }
                  return null;
                },
                all: async () => {
                  const table = mockDB.get("matches") || [];
                  if (sql.includes("ORDER BY date_utc DESC")) {
                    const [teamId, limit] = params;
                    const filtered = table.filter((m: any) => m.team_id === teamId);
                    const sorted = filtered.sort((a: any, b: any) => b.date_utc - a.date_utc);
                    return { results: sorted.slice(0, limit) };
                  }
                  return { results: [] };
                },
                run: async () => {
                  if (sql.includes("INSERT INTO matches")) {
                    const table = mockDB.get("matches") || [];
                    const [id, team_id, date_utc, venue, lat, lon, status] = params;
                    table.push({ id, team_id, date_utc, venue, lat, lon, status: status || "scheduled" });
                    mockDB.set("matches", table);
                  } else if (sql.includes("UPDATE matches SET status")) {
                    const [status, id] = params;
                    const table = mockDB.get("matches") || [];
                    const match = table.find((m: any) => m.id === id);
                    if (match) match.status = status;
                  } else if (sql.includes("DELETE FROM matches")) {
                    const [id] = params;
                    const table = mockDB.get("matches") || [];
                    mockDB.set("matches", table.filter((m: any) => m.id !== id));
                  }
                  return { success: true };
                },
              };
            },
          };
        },
      },
    };
  });

  describe("getNextFixture", () => {
    it("returns the next upcoming fixture", async () => {
      const now = Math.floor(Date.now() / 1000);
      const futureDate = now + 86400; // Tomorrow

      const table = mockDB.get("matches") || [];
      table.push({
        id: "match-1",
        team_id: "tenant-123",
        date_utc: futureDate,
        status: "scheduled",
        venue: "Home Stadium",
      });
      mockDB.set("matches", table);

      const mockReq = { tenant: "tenant-123" };
      const response = await getNextFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.fixture).toBeDefined();
      expect(data.fixture.id).toBe("match-1");
    });

    it("returns null when no upcoming fixtures exist", async () => {
      const mockReq = { tenant: "tenant-123" };
      const response = await getNextFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.fixture).toBeNull();
    });

    it("only returns scheduled matches", async () => {
      const now = Math.floor(Date.now() / 1000);
      const futureDate = now + 86400;

      const table = mockDB.get("matches") || [];
      table.push({
        id: "match-1",
        team_id: "tenant-123",
        date_utc: futureDate,
        status: "completed",
        venue: "Home Stadium",
      });
      mockDB.set("matches", table);

      const mockReq = { tenant: "tenant-123" };
      const response = await getNextFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.fixture).toBeNull();
    });

    it("isolates fixtures by tenant", async () => {
      const now = Math.floor(Date.now() / 1000);
      const futureDate = now + 86400;

      const table = mockDB.get("matches") || [];
      table.push({
        id: "match-1",
        team_id: "tenant-456",
        date_utc: futureDate,
        status: "scheduled",
      });
      mockDB.set("matches", table);

      const mockReq = { tenant: "tenant-123" };
      const response = await getNextFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.fixture).toBeNull();
    });
  });

  describe("getLeagueTable", () => {
    it("returns league table from KV", async () => {
      const table = {
        standings: [
          { position: 1, team: "Team A", points: 30 },
          { position: 2, team: "Team B", points: 25 },
        ],
        last_updated: Date.now(),
      };

      await mockEnv.KV.put(`league:tenant-123:table`, JSON.stringify(table));

      const mockReq = { tenant: "tenant-123" };
      const response = await getLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.table.standings.length).toBe(2);
      expect(data.table.standings[0].team).toBe("Team A");
    });

    it("returns empty table when not set", async () => {
      const mockReq = { tenant: "tenant-123" };
      const response = await getLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.table.standings).toEqual([]);
      expect(data.table.last_updated).toBeNull();
    });

    it("isolates league tables by tenant", async () => {
      await mockEnv.KV.put(
        `league:tenant-456:table`,
        JSON.stringify({ standings: [{ team: "Other Team" }], last_updated: Date.now() })
      );

      const mockReq = { tenant: "tenant-123" };
      const response = await getLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.table.standings).toEqual([]);
    });
  });

  describe("upsertLeagueTable", () => {
    it("creates a new league table", async () => {
      const standings = [
        { position: 1, team: "Team A", points: 30 },
        { position: 2, team: "Team B", points: 25 },
      ];

      const mockReq = {
        tenant: "tenant-123",
        json: { standings, competition: "Premier League", season: 2025 },
      };

      const response = await upsertLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.table.standings.length).toBe(2);
      expect(data.table.competition).toBe("Premier League");
      expect(data.table.season).toBe(2025);
    });

    it("throws error when standings is missing", async () => {
      const mockReq = { tenant: "tenant-123", json: {} };
      const response = await upsertLeagueTable(mockReq, mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("standings array required");
    });

    it("throws error when standings is not an array", async () => {
      const mockReq = { tenant: "tenant-123", json: { standings: "not an array" } };
      const response = await upsertLeagueTable(mockReq, mockEnv);

      expect(response.status).toBe(400);
    });

    it("defaults competition and season", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: { standings: [{ team: "Team A" }] },
      };

      const response = await upsertLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.table.competition).toBe("Unknown");
      expect(data.table.season).toBe(new Date().getFullYear());
    });
  });

  describe("createMatch", () => {
    it("creates a new match", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: {
          home_team: "Team A",
          away_team: "Team B",
          date_utc: 1704067200, // 2024-01-01
          venue: "Home Stadium",
          competition: "League",
        },
      };

      const response = await createMatch(mockReq, mockEnv);
      const data = await response.json();

      expect(data.match_id).toBeDefined();
      expect(data.status).toBe("scheduled");

      // Verify it's in KV
      const stored = await mockEnv.KV.get(`match:tenant-123:${data.match_id}`, "json");
      expect(stored.home_team).toBe("Team A");
      expect(stored.away_team).toBe("Team B");
    });

    it("throws error when required fields are missing", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: { home_team: "Team A" },
      };

      const response = await createMatch(mockReq, mockEnv);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("required");
    });

    it("stores match in both D1 and KV", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: {
          home_team: "Team A",
          away_team: "Team B",
          date_utc: 1704067200,
        },
      };

      const response = await createMatch(mockReq, mockEnv);
      const data = await response.json();

      // Check D1
      const dbMatches = mockDB.get("matches") || [];
      expect(dbMatches.length).toBe(1);
      expect(dbMatches[0].id).toBe(data.match_id);

      // Check KV
      const kvMatch = await mockEnv.KV.get(`match:tenant-123:${data.match_id}`, "json");
      expect(kvMatch).toBeDefined();
    });
  });

  describe("getMatch", () => {
    it("returns match details from KV", async () => {
      const matchData = {
        match_id: "match-123",
        home_team: "Team A",
        away_team: "Team B",
        status: "scheduled",
      };

      await mockEnv.KV.put(`match:tenant-123:match-123`, JSON.stringify(matchData));

      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
      };

      const response = await getMatch(mockReq, mockEnv);
      const data = await response.json();

      expect(data.match.match_id).toBe("match-123");
      expect(data.match.home_team).toBe("Team A");
    });

    it("returns 404 when match not found", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-999",
      };

      const response = await getMatch(mockReq, mockEnv);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });

    it("isolates matches by tenant", async () => {
      await mockEnv.KV.put(
        `match:tenant-456:match-123`,
        JSON.stringify({ match_id: "match-123" })
      );

      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
      };

      const response = await getMatch(mockReq, mockEnv);
      expect(response.status).toBe(404);
    });
  });

  describe("updateMatch", () => {
    beforeEach(async () => {
      const matchData = {
        match_id: "match-123",
        home_team: "Team A",
        away_team: "Team B",
        status: "scheduled",
      };
      await mockEnv.KV.put(`match:tenant-123:match-123`, JSON.stringify(matchData));

      const table = mockDB.get("matches") || [];
      table.push({ id: "match-123", team_id: "tenant-123", status: "scheduled" });
      mockDB.set("matches", table);
    });

    it("updates match status", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
        json: { status: "in_progress" },
      };

      const response = await updateMatch(mockReq, mockEnv);
      const data = await response.json();

      expect(data.match.status).toBe("in_progress");
    });

    it("updates match scores", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
        json: { home_score: 2, away_score: 1 },
      };

      const response = await updateMatch(mockReq, mockEnv);
      const data = await response.json();

      expect(data.match.home_score).toBe(2);
      expect(data.match.away_score).toBe(1);
    });

    it("updates status in both KV and D1", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
        json: { status: "completed" },
      };

      await updateMatch(mockReq, mockEnv);

      // Check KV
      const kvMatch = await mockEnv.KV.get(`match:tenant-123:match-123`, "json");
      expect(kvMatch.status).toBe("completed");

      // Check D1
      const dbMatches = mockDB.get("matches") || [];
      const dbMatch = dbMatches.find((m: any) => m.id === "match-123");
      expect(dbMatch.status).toBe("completed");
    });

    it("returns 404 when match not found", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-999",
        json: { status: "completed" },
      };

      const response = await updateMatch(mockReq, mockEnv);
      expect(response.status).toBe(404);
    });
  });

  describe("listFixtures", () => {
    beforeEach(() => {
      const table = mockDB.get("matches") || [];
      for (let i = 1; i <= 25; i++) {
        table.push({
          id: `fixture-${i}`,
          team_id: "tenant-123",
          date_utc: 1704067200 + i * 86400,
        });
      }
      mockDB.set("matches", table);
    });

    it("lists fixtures with default limit", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/fixtures",
      };

      const response = await listFixtures(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data.length).toBe(20); // Default limit
    });

    it("respects custom limit parameter", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/fixtures?limit=10",
      };

      const response = await listFixtures(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data.length).toBe(10);
    });

    it("returns fixtures in descending date order", async () => {
      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/fixtures?limit=5",
      };

      const response = await listFixtures(mockReq, mockEnv);
      const data = await response.json();

      // Most recent should be first
      for (let i = 1; i < data.data.length; i++) {
        expect(data.data[i - 1].date_utc).toBeGreaterThanOrEqual(data.data[i].date_utc);
      }
    });
  });

  describe("createFixture", () => {
    it("creates a new fixture", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: {
          opponent: "Rival Team",
          date: "2025-06-15",
          time: "15:00",
          venue: "Home Stadium",
          competition: "Cup",
          homeAway: "home",
        },
      };

      const response = await createFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.opponent).toBe("Rival Team");
      expect(data.data.status).toBe("scheduled");
    });

    it("throws error when opponent is missing", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: { date: "2025-06-15" },
      };

      const response = await createFixture(mockReq, mockEnv);
      expect(response.status).toBe(400);
    });

    it("throws error when date is missing", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: { opponent: "Rival Team" },
      };

      const response = await createFixture(mockReq, mockEnv);
      expect(response.status).toBe(400);
    });

    it("marks fixture as completed when scores provided", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: {
          opponent: "Rival Team",
          date: "2025-06-15",
          homeScore: 3,
          awayScore: 1,
        },
      };

      const response = await createFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data.status).toBe("completed");
      expect(data.data.homeScore).toBe(3);
      expect(data.data.awayScore).toBe(1);
    });

    it("defaults optional fields", async () => {
      const mockReq = {
        tenant: "tenant-123",
        json: {
          opponent: "Rival Team",
          date: "2025-06-15",
        },
      };

      const response = await createFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data.time).toBe("TBC");
      expect(data.data.venue).toBe("TBC");
      expect(data.data.competition).toBe("League");
      expect(data.data.homeAway).toBe("home");
    });
  });

  describe("updateFixture", () => {
    beforeEach(async () => {
      const fixture = {
        id: "fixture-123",
        opponent: "Team A",
        status: "scheduled",
      };
      await mockEnv.KV.put(`fixture:tenant-123:fixture-123`, JSON.stringify(fixture));
    });

    it("updates fixture fields", async () => {
      const mockReq = {
        tenant: "tenant-123",
        params: { id: "fixture-123" },
        json: { status: "completed", homeScore: 2, awayScore: 1 },
      };

      const response = await updateFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe("completed");
      expect(data.data.homeScore).toBe(2);
    });

    it("returns 404 when fixture not found", async () => {
      const mockReq = {
        tenant: "tenant-123",
        params: { id: "fixture-999" },
        json: { status: "completed" },
      };

      const response = await updateFixture(mockReq, mockEnv);
      expect(response.status).toBe(404);
    });

    it("preserves existing fields", async () => {
      const mockReq = {
        tenant: "tenant-123",
        params: { id: "fixture-123" },
        json: { status: "completed" },
      };

      const response = await updateFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data.opponent).toBe("Team A"); // Preserved
      expect(data.data.status).toBe("completed"); // Updated
    });
  });

  describe("deleteFixture", () => {
    beforeEach(async () => {
      await mockEnv.KV.put(
        `fixture:tenant-123:fixture-123`,
        JSON.stringify({ id: "fixture-123" })
      );

      const table = mockDB.get("matches") || [];
      table.push({ id: "fixture-123", team_id: "tenant-123" });
      mockDB.set("matches", table);
    });

    it("deletes fixture from KV and D1", async () => {
      const mockReq = {
        tenant: "tenant-123",
        params: { id: "fixture-123" },
      };

      const response = await deleteFixture(mockReq, mockEnv);
      const data = await response.json();

      expect(data.success).toBe(true);

      // Verify deleted from KV
      const kvFixture = await mockEnv.KV.get(`fixture:tenant-123:fixture-123`);
      expect(kvFixture).toBeNull();

      // Verify deleted from D1
      const dbMatches = mockDB.get("matches") || [];
      const found = dbMatches.find((m: any) => m.id === "fixture-123");
      expect(found).toBeUndefined();
    });
  });

  describe("Squad Management", () => {
    describe("createPlayer", () => {
      it("creates a new player", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: {
            name: "John Doe",
            number: 10,
            position: "Forward",
            goals: 15,
            assists: 8,
            appearances: 25,
          },
        };

        const response = await createPlayer(mockReq, mockEnv);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.name).toBe("John Doe");
        expect(data.data.number).toBe(10);
        expect(data.data.goals).toBe(15);
      });

      it("throws error when name is missing", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { number: 10 },
        };

        const response = await createPlayer(mockReq, mockEnv);
        expect(response.status).toBe(400);
      });

      it("throws error when number is missing", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { name: "John Doe" },
        };

        const response = await createPlayer(mockReq, mockEnv);
        expect(response.status).toBe(400);
      });

      it("defaults optional stats to 0", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { name: "John Doe", number: 10 },
        };

        const response = await createPlayer(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.goals).toBe(0);
        expect(data.data.assists).toBe(0);
        expect(data.data.yellowCards).toBe(0);
        expect(data.data.redCards).toBe(0);
      });

      it("defaults position to Forward", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { name: "John Doe", number: 10 },
        };

        const response = await createPlayer(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.position).toBe("Forward");
      });

      it("adds player to squad list", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { name: "John Doe", number: 10 },
        };

        await createPlayer(mockReq, mockEnv);

        const squad = await mockEnv.KV.get(`squad:tenant-123:list`, "json");
        expect(squad.length).toBe(1);
        expect(squad[0].name).toBe("John Doe");
      });
    });

    describe("listSquad", () => {
      beforeEach(async () => {
        const squad = [
          { id: "player-1", name: "Player 1", number: 1 },
          { id: "player-2", name: "Player 2", number: 2 },
        ];
        await mockEnv.KV.put(`squad:tenant-123:list`, JSON.stringify(squad));
      });

      it("lists all squad players", async () => {
        const mockReq = {
          tenant: "tenant-123",
          url: "https://example.com/api/squad",
        };

        const response = await listSquad(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.length).toBe(2);
        expect(data.data[0].name).toBe("Player 1");
      });

      it("returns empty array when no squad exists", async () => {
        const mockReq = {
          tenant: "tenant-999",
          url: "https://example.com/api/squad",
        };

        const response = await listSquad(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data).toEqual([]);
      });
    });

    describe("updatePlayer", () => {
      beforeEach(async () => {
        const player = {
          id: "player-123",
          name: "John Doe",
          number: 10,
          goals: 5,
        };
        await mockEnv.KV.put(`player:tenant-123:player-123`, JSON.stringify(player));

        const squad = [player];
        await mockEnv.KV.put(`squad:tenant-123:list`, JSON.stringify(squad));
      });

      it("updates player stats", async () => {
        const mockReq = {
          tenant: "tenant-123",
          params: { id: "player-123" },
          json: { goals: 10, assists: 3 },
        };

        const response = await updatePlayer(mockReq, mockEnv);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.goals).toBe(10);
        expect(data.data.assists).toBe(3);
      });

      it("updates player in squad list", async () => {
        const mockReq = {
          tenant: "tenant-123",
          params: { id: "player-123" },
          json: { goals: 10 },
        };

        await updatePlayer(mockReq, mockEnv);

        const squad = await mockEnv.KV.get(`squad:tenant-123:list`, "json");
        const player = squad.find((p: any) => p.id === "player-123");
        expect(player.goals).toBe(10);
      });

      it("returns 404 when player not found", async () => {
        const mockReq = {
          tenant: "tenant-123",
          params: { id: "player-999" },
          json: { goals: 10 },
        };

        const response = await updatePlayer(mockReq, mockEnv);
        expect(response.status).toBe(404);
      });
    });

    describe("deletePlayer", () => {
      beforeEach(async () => {
        const player = { id: "player-123", name: "John Doe" };
        await mockEnv.KV.put(`player:tenant-123:player-123`, JSON.stringify(player));

        const squad = [player, { id: "player-456", name: "Jane Doe" }];
        await mockEnv.KV.put(`squad:tenant-123:list`, JSON.stringify(squad));
      });

      it("deletes player from KV", async () => {
        const mockReq = {
          tenant: "tenant-123",
          params: { id: "player-123" },
        };

        const response = await deletePlayer(mockReq, mockEnv);
        const data = await response.json();

        expect(data.success).toBe(true);

        const player = await mockEnv.KV.get(`player:tenant-123:player-123`);
        expect(player).toBeNull();
      });

      it("removes player from squad list", async () => {
        const mockReq = {
          tenant: "tenant-123",
          params: { id: "player-123" },
        };

        await deletePlayer(mockReq, mockEnv);

        const squad = await mockEnv.KV.get(`squad:tenant-123:list`, "json");
        expect(squad.length).toBe(1);
        expect(squad[0].id).toBe("player-456");
      });
    });
  });

  describe("Feed Posts", () => {
    describe("createPost", () => {
      it("creates a new feed post", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: {
            content: "Great win today! 3-1 victory!",
            channels: ["feed", "parents"],
            media: ["image1.jpg"],
          },
        };

        const response = await createPost(mockReq, mockEnv);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.content).toBe("Great win today! 3-1 victory!");
        expect(data.data.channels).toEqual(["feed", "parents"]);
        expect(data.data.likes).toBe(0);
      });

      it("throws error when content is missing", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: {},
        };

        const response = await createPost(mockReq, mockEnv);
        expect(response.status).toBe(400);
      });

      it("defaults channels to [feed]", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { content: "Test post" },
        };

        const response = await createPost(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.channels).toEqual(["feed"]);
      });

      it("defaults media to empty array", async () => {
        const mockReq = {
          tenant: "tenant-123",
          json: { content: "Test post" },
        };

        const response = await createPost(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.media).toEqual([]);
      });

      it("adds post to beginning of feed", async () => {
        // Create first post
        await createPost({
          tenant: "tenant-123",
          json: { content: "First post" },
        }, mockEnv);

        // Create second post
        await createPost({
          tenant: "tenant-123",
          json: { content: "Second post" },
        }, mockEnv);

        const posts = await mockEnv.KV.get(`feed:tenant-123:posts`, "json");
        expect(posts[0].content).toBe("Second post"); // Most recent first
        expect(posts[1].content).toBe("First post");
      });
    });

    describe("listPosts", () => {
      beforeEach(async () => {
        const posts = [];
        for (let i = 1; i <= 50; i++) {
          posts.push({
            id: `post-${i}`,
            content: `Post ${i}`,
            created_at: Date.now() - i * 1000,
          });
        }
        await mockEnv.KV.put(`feed:tenant-123:posts`, JSON.stringify(posts));
      });

      it("lists posts with default pagination", async () => {
        const mockReq = {
          tenant: "tenant-123",
          url: "https://example.com/api/feed",
        };

        const response = await listPosts(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.length).toBe(20); // Default limit
        expect(data.total).toBe(50);
        expect(data.page).toBe(1);
        expect(data.limit).toBe(20);
      });

      it("respects custom page parameter", async () => {
        const mockReq = {
          tenant: "tenant-123",
          url: "https://example.com/api/feed?page=2",
        };

        const response = await listPosts(mockReq, mockEnv);
        const data = await response.json();

        expect(data.page).toBe(2);
        expect(data.data.length).toBe(20);
        expect(data.data[0].id).toBe("post-21"); // Second page
      });

      it("respects custom limit parameter", async () => {
        const mockReq = {
          tenant: "tenant-123",
          url: "https://example.com/api/feed?limit=10",
        };

        const response = await listPosts(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data.length).toBe(10);
        expect(data.limit).toBe(10);
      });

      it("returns empty array when no posts exist", async () => {
        const mockReq = {
          tenant: "tenant-999",
          url: "https://example.com/api/feed",
        };

        const response = await listPosts(mockReq, mockEnv);
        const data = await response.json();

        expect(data.data).toEqual([]);
        expect(data.total).toBe(0);
      });
    });
  });

  describe("Tenant Isolation", () => {
    it("prevents cross-tenant match access", async () => {
      await mockEnv.KV.put(
        `match:tenant-456:match-123`,
        JSON.stringify({ match_id: "match-123" })
      );

      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/matches/match-123",
      };

      const response = await getMatch(mockReq, mockEnv);
      expect(response.status).toBe(404);
    });

    it("prevents cross-tenant league table access", async () => {
      await mockEnv.KV.put(
        `league:tenant-456:table`,
        JSON.stringify({ standings: [{ team: "Team A" }] })
      );

      const mockReq = { tenant: "tenant-123" };
      const response = await getLeagueTable(mockReq, mockEnv);
      const data = await response.json();

      expect(data.table.standings).toEqual([]);
    });

    it("prevents cross-tenant squad access", async () => {
      await mockEnv.KV.put(
        `squad:tenant-456:list`,
        JSON.stringify([{ id: "player-1", name: "Player 1" }])
      );

      const mockReq = {
        tenant: "tenant-123",
        url: "https://example.com/api/squad",
      };

      const response = await listSquad(mockReq, mockEnv);
      const data = await response.json();

      expect(data.data).toEqual([]);
    });
  });
});
