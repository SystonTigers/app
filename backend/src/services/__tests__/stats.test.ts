import { describe, it, expect, beforeEach } from "vitest";
import { teamStats, playerStats, getTopScorers } from "../stats";

/**
 * Stats Service Tests
 *
 * Tests statistics calculation for teams and players including
 * match results, player events, and top scorers.
 */
describe("Stats Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockDB: any;
  let dbMatches: any[];
  let dbEvents: any[];

  // Helper to parse Response JSON
  const parseResponse = async (response: Response) => {
    const text = await response.text();
    return JSON.parse(text);
  };

  beforeEach(() => {
    // Create fresh mock data for each test
    mockKV = new Map();
    dbMatches = [];
    dbEvents = [];

    // Mock D1 database
    mockDB = {
      prepare: (query: string) => {
        return {
          bind: (...params: any[]) => {
            return {
              all: async () => {
                // Query for matches
                if (query.includes("FROM matches")) {
                  const tenant = params[0];
                  const results = dbMatches.filter((m) => m.team_id === tenant);
                  return { results };
                }

                // Query for player events (specific player)
                if (query.includes("FROM events") && params.length === 2) {
                  const tenant = params[0];
                  const playerId = params[1];
                  const results = dbEvents.filter(
                    (e) => e.team_id === tenant && e.player_id === playerId
                  );
                  return { results };
                }

                // Query for all player events
                if (query.includes("FROM events") && params.length === 1) {
                  const tenant = params[0];
                  const results = dbEvents.filter((e) => e.team_id === tenant);
                  return { results };
                }

                return { results: [] };
              },
            };
          },
        };
      },
    };

    mockEnv = {
      KV: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") {
            try {
              return JSON.parse(value);
            } catch {
              return null;
            }
          }
          return value;
        },
      },
      DB: mockDB,
    };
  });

  describe("teamStats()", () => {
    it("calculates stats for team with wins, draws, and losses", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      // Add 3 completed matches
      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "syston", status: "completed", date_utc: "2024-01-08" },
        { id: "match3", team_id: "syston", status: "completed", date_utc: "2024-01-15" }
      );

      // Add match data to KV: Win, Draw, Loss
      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 3, away_score: 1 }));
      mockKV.set("match:syston:match2", JSON.stringify({ home_score: 2, away_score: 2 }));
      mockKV.set("match:syston:match3", JSON.stringify({ home_score: 1, away_score: 4 }));

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.played).toBe(3);
      expect(data.wins).toBe(1);
      expect(data.draws).toBe(1);
      expect(data.losses).toBe(1);
      expect(data.goals_for).toBe(6); // 3 + 2 + 1
      expect(data.goals_against).toBe(7); // 1 + 2 + 4
      expect(data.goal_difference).toBe(-1);
      expect(data.points).toBe(4); // 3 + 1
    });

    it("returns zero stats when no matches exist", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.played).toBe(0);
      expect(data.wins).toBe(0);
      expect(data.draws).toBe(0);
      expect(data.losses).toBe(0);
      expect(data.goals_for).toBe(0);
      expect(data.goals_against).toBe(0);
      expect(data.goal_difference).toBe(0);
      expect(data.points).toBe(0);
    });

    it("only counts completed or final matches", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "syston", status: "scheduled", date_utc: "2024-01-08" },
        { id: "match3", team_id: "syston", status: "final", date_utc: "2024-01-15" }
      );

      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 2, away_score: 1 }));
      mockKV.set("match:syston:match3", JSON.stringify({ home_score: 3, away_score: 0 }));

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.played).toBe(2);
      expect(data.wins).toBe(2);
    });

    it("handles all wins correctly", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "syston", status: "completed", date_utc: "2024-01-08" }
      );

      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 3, away_score: 1 }));
      mockKV.set("match:syston:match2", JSON.stringify({ home_score: 2, away_score: 0 }));

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.wins).toBe(2);
      expect(data.draws).toBe(0);
      expect(data.losses).toBe(0);
      expect(data.points).toBe(6);
    });

    it("handles all draws correctly", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "syston", status: "completed", date_utc: "2024-01-08" }
      );

      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 1, away_score: 1 }));
      mockKV.set("match:syston:match2", JSON.stringify({ home_score: 0, away_score: 0 }));

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.wins).toBe(0);
      expect(data.draws).toBe(2);
      expect(data.losses).toBe(0);
      expect(data.points).toBe(2);
    });

    it("handles zero-zero draw", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push({ id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" });
      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 0, away_score: 0 }));

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.draws).toBe(1);
      expect(data.goals_for).toBe(0);
      expect(data.goals_against).toBe(0);
      expect(data.goal_difference).toBe(0);
    });

    it("ignores matches without score data in KV", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "syston", status: "completed", date_utc: "2024-01-08" }
      );

      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 2, away_score: 1 }));
      // match2 has no data in KV

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.played).toBe(1);
      expect(data.wins).toBe(1);
    });

    it("includes season parameter in response", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/team?season=2024",
      };

      const response = await teamStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.season).toBe("2024");
    });

    it("isolates stats by tenant", async () => {
      const mockReq1 = {
        tenant: "syston",
        url: "https://api.example.com/stats/team",
      };

      const mockReq2 = {
        tenant: "kingsthorpe",
        url: "https://api.example.com/stats/team",
      };

      dbMatches.push(
        { id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" },
        { id: "match2", team_id: "kingsthorpe", status: "completed", date_utc: "2024-01-01" }
      );

      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 3, away_score: 1 }));
      mockKV.set("match:kingsthorpe:match2", JSON.stringify({ home_score: 1, away_score: 2 }));

      const response1 = await teamStats(mockReq1, mockEnv);
      const response2 = await teamStats(mockReq2, mockEnv);

      const data1 = await parseResponse(response1);
      const data2 = await parseResponse(response2);

      expect(data1.wins).toBe(1);
      expect(data2.losses).toBe(1);
    });
  });

  describe("playerStats()", () => {
    it("calculates stats for specific player", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match2", type: "assist", date_utc: "2024-01-08" },
        { team_id: "syston", player_id: "player1", match_id: "match3", type: "card_yellow", date_utc: "2024-01-15" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.player_id).toBe("player1");
      expect(data.appearances).toBe(3);
      expect(data.goals).toBe(2);
      expect(data.assists).toBe(1);
      expect(data.yellow_cards).toBe(1);
      expect(data.red_cards).toBe(0);
      expect(data.sin_bins).toBe(0);
    });

    it("returns zero stats for player with no events", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.player_id).toBe("player1");
      expect(data.appearances).toBe(0);
      expect(data.goals).toBe(0);
      expect(data.assists).toBe(0);
    });

    it("tracks all event types correctly", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "assist", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "card_yellow", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "card_red", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "sin_bin", date_utc: "2024-01-01" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.goals).toBe(1);
      expect(data.assists).toBe(1);
      expect(data.yellow_cards).toBe(1);
      expect(data.red_cards).toBe(1);
      expect(data.sin_bins).toBe(1);
    });

    it("counts appearances as unique matches", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "assist", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match2", type: "goal", date_utc: "2024-01-08" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.appearances).toBe(2);
      expect(data.goals).toBe(3);
    });

    it("returns all players stats when no player_id provided", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "assist", date_utc: "2024-01-08" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.players).toHaveLength(3);
      expect(data.players[0].player_id).toBe("player1");
      expect(data.players[0].goals).toBe(2);
      expect(data.players[1].player_id).toBe("player2");
      expect(data.players[1].goals).toBe(1);
    });

    it("sorts players by goals descending when returning all players", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "goal", date_utc: "2024-01-08" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "goal", date_utc: "2024-01-08" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.players[0].player_id).toBe("player2");
      expect(data.players[0].goals).toBe(3);
      expect(data.players[1].player_id).toBe("player3");
      expect(data.players[1].goals).toBe(2);
      expect(data.players[2].player_id).toBe("player1");
      expect(data.players[2].goals).toBe(1);
    });

    it("filters events by tenant", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "kingsthorpe", player_id: "player1", match_id: "match2", type: "goal", date_utc: "2024-01-01" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.goals).toBe(1);
    });

    it("includes season parameter in response", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1&season=2024",
      };

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.season).toBe("2024");
    });

    it("ignores events without player_id when getting all players", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: null, match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: undefined, match_id: "match1", type: "goal", date_utc: "2024-01-01" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.players).toHaveLength(1);
      expect(data.players[0].player_id).toBe("player1");
    });
  });

  describe("getTopScorers()", () => {
    it("returns top scorers limited by default limit of 10", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/top-scorers",
      };

      // Create 15 players with different goal counts
      for (let i = 1; i <= 15; i++) {
        for (let g = 0; g < i; g++) {
          dbEvents.push({
            team_id: "syston",
            player_id: `player${i}`,
            match_id: `match${i}`,
            type: "goal",
            date_utc: "2024-01-01",
          });
        }
      }

      const response = await getTopScorers(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.top_scorers).toHaveLength(10);
      expect(data.top_scorers[0].player_id).toBe("player15");
      expect(data.top_scorers[0].goals).toBe(15);
    });

    it("respects custom limit parameter", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/top-scorers?limit=5",
      };

      for (let i = 1; i <= 10; i++) {
        for (let g = 0; g < i; g++) {
          dbEvents.push({
            team_id: "syston",
            player_id: `player${i}`,
            match_id: `match${i}`,
            type: "goal",
            date_utc: "2024-01-01",
          });
        }
      }

      const response = await getTopScorers(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.top_scorers).toHaveLength(5);
      expect(data.top_scorers[0].goals).toBe(10);
      expect(data.top_scorers[4].goals).toBe(6);
    });

    it("returns empty array when no players have scored", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/top-scorers",
      };

      const response = await getTopScorers(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.top_scorers).toEqual([]);
    });

    it("returns all players when fewer than limit", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/top-scorers?limit=10",
      };

      for (let i = 1; i <= 3; i++) {
        dbEvents.push({
          team_id: "syston",
          player_id: `player${i}`,
          match_id: `match${i}`,
          type: "goal",
          date_utc: "2024-01-01",
        });
      }

      const response = await getTopScorers(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.top_scorers).toHaveLength(3);
    });

    it("sorts players by goals descending", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/top-scorers?limit=3",
      };

      // player1: 1 goal, player2: 5 goals, player3: 3 goals
      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "goal", date_utc: "2024-01-08" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "goal", date_utc: "2024-01-08" },
        { team_id: "syston", player_id: "player3", match_id: "match2", type: "goal", date_utc: "2024-01-08" }
      );

      const response = await getTopScorers(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.top_scorers[0].player_id).toBe("player2");
      expect(data.top_scorers[0].goals).toBe(5);
      expect(data.top_scorers[1].player_id).toBe("player3");
      expect(data.top_scorers[1].goals).toBe(3);
      expect(data.top_scorers[2].player_id).toBe("player1");
      expect(data.top_scorers[2].goals).toBe(1);
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles complete stats workflow for team and players", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats",
      };

      // Add match data
      dbMatches.push({ id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" });
      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 3, away_score: 1 }));

      // Add player events
      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "goal", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player2", match_id: "match1", type: "assist", date_utc: "2024-01-01" }
      );

      // Get team stats
      const teamResp = await teamStats(mockReq, mockEnv);
      const teamData = await parseResponse(teamResp);

      expect(teamData.wins).toBe(1);
      expect(teamData.goals_for).toBe(3);

      // Get player stats
      const playerResp = await playerStats(
        { ...mockReq, url: "https://api.example.com/stats/player?player_id=player1" },
        mockEnv
      );
      const playerData = await parseResponse(playerResp);

      expect(playerData.goals).toBe(2);

      // Get top scorers
      const topScorersResp = await getTopScorers(
        { ...mockReq, url: "https://api.example.com/stats/top-scorers?limit=2" },
        mockEnv
      );
      const topScorersData = await parseResponse(topScorersResp);

      expect(topScorersData.top_scorers[0].player_id).toBe("player1");
      expect(topScorersData.top_scorers[0].goals).toBe(2);
    });

    it("handles multiple tenants independently", async () => {
      // Syston data
      dbMatches.push({ id: "match1", team_id: "syston", status: "completed", date_utc: "2024-01-01" });
      mockKV.set("match:syston:match1", JSON.stringify({ home_score: 5, away_score: 0 }));
      dbEvents.push({
        team_id: "syston",
        player_id: "player1",
        match_id: "match1",
        type: "goal",
        date_utc: "2024-01-01",
      });

      // Kingsthorpe data
      dbMatches.push({ id: "match2", team_id: "kingsthorpe", status: "completed", date_utc: "2024-01-01" });
      mockKV.set("match:kingsthorpe:match2", JSON.stringify({ home_score: 0, away_score: 3 }));
      dbEvents.push({
        team_id: "kingsthorpe",
        player_id: "player2",
        match_id: "match2",
        type: "assist",
        date_utc: "2024-01-01",
      });

      const systonTeam = await teamStats(
        { tenant: "syston", url: "https://api.example.com/stats/team" },
        mockEnv
      );
      const kingsthorpeTeam = await teamStats(
        { tenant: "kingsthorpe", url: "https://api.example.com/stats/team" },
        mockEnv
      );

      const systonData = await parseResponse(systonTeam);
      const kingsthorpeData = await parseResponse(kingsthorpeTeam);

      expect(systonData.wins).toBe(1);
      expect(kingsthorpeData.losses).toBe(1);
    });

    it("handles player with multiple card types", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/stats/player?player_id=player1",
      };

      dbEvents.push(
        { team_id: "syston", player_id: "player1", match_id: "match1", type: "card_yellow", date_utc: "2024-01-01" },
        { team_id: "syston", player_id: "player1", match_id: "match2", type: "card_yellow", date_utc: "2024-01-08" },
        { team_id: "syston", player_id: "player1", match_id: "match3", type: "card_red", date_utc: "2024-01-15" },
        { team_id: "syston", player_id: "player1", match_id: "match4", type: "sin_bin", date_utc: "2024-01-22" }
      );

      const response = await playerStats(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.yellow_cards).toBe(2);
      expect(data.red_cards).toBe(1);
      expect(data.sin_bins).toBe(1);
      expect(data.appearances).toBe(4);
    });

    it("calculates goal difference correctly for various scenarios", async () => {
      const scenarios = [
        { home: 5, away: 2, expectedDiff: 3 },
        { home: 1, away: 1, expectedDiff: 0 },
        { home: 0, away: 3, expectedDiff: -3 },
        { home: 10, away: 0, expectedDiff: 10 },
      ];

      for (const scenario of scenarios) {
        mockKV.clear();
        dbMatches = [{ id: "match1", team_id: "test", status: "completed", date_utc: "2024-01-01" }];
        mockKV.set("match:test:match1", JSON.stringify({ home_score: scenario.home, away_score: scenario.away }));

        const response = await teamStats({ tenant: "test", url: "https://api.example.com/stats/team" }, mockEnv);
        const data = await parseResponse(response);

        expect(data.goal_difference).toBe(scenario.expectedDiff);
      }
    });
  });
});
