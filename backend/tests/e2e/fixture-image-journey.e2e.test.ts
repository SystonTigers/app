/**
 * Journey: the manager takes a photo (or screenshot) of a fixture list, the
 * fixtures it shows come back to check, and the ones ticked are added. Adding
 * them again changes nothing. Nothing is saved until staff confirm, and the
 * picture itself is never stored. Workers AI is replaced by a stand-in here.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

// Enough of a PNG for the type check; the stand-in "reads" it
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

type Ai = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
const setAi = (ai: Ai | undefined) => { (env as unknown as { AI?: Ai }).AI = ai; };

const reply = {
  response: 'Sure! ```json\n' + JSON.stringify({
    fixtures: [
      { date: "2026-11-07", time: "10:30", home: "Syston Tigers", away: "Photo Rovers", venue: "Syston Park", competition: "Junior Cup", status: "scheduled" },
      { date: "--11-14", time: "2pm", home: "Mystery FC", away: "Other Town", venue: null, competition: null, status: "scheduled" },
    ],
  }) + "\n```",
};

describe("Fixtures from a photo journey", () => {
  it("reads a picture, then adds the fixtures staff tick", async () => {
    const coach = await registerAdmin("photo-coach");
    const parent = await registerMember("photo-parent");
    const read = (body: Uint8Array, token = coach.token) =>
      call("/api/v1/club/fixtures/from-image", { token, body, headers: { "content-type": "image/png" } });

    // Not switched on yet: a clear message
    setAi(undefined);
    expect((await read(PNG)).data.error.code).toBe("NOT_AVAILABLE");

    let seenInput: Record<string, unknown> | null = null;
    setAi({ run: async (_model, input) => { seenInput = input; return reply; } });

    // Families can't, and it must be a picture
    expect((await read(PNG, parent.token)).status).toBe(403);
    expect((await read(new TextEncoder().encode("hello"))).status).toBe(415);

    const found = await read(PNG);
    expect(found.status).toBe(200);
    const fixtures = found.data.data.fixtures as any[];
    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]).toMatchObject({ date: "2026-11-07", time: "10:30", home: "Syston Tigers", away: "Photo Rovers", us: "home", opponent: "Photo Rovers", competition: "Junior Cup" });
    // The picture doesn't say which is the club: staff choose
    expect(fixtures[1]).toMatchObject({ time: "14:00", us: null, opponent: null });
    expect(fixtures[1].date).toMatch(/^\d{4}-11-14$/);
    // The model was given the picture and told the club's name
    expect(Array.isArray(seenInput!.image)).toBe(true);
    expect(JSON.stringify(seenInput!.messages)).toContain("Syston Tigers (test)");

    // Nothing saved yet
    const count = async (opponent: string) => (await env.DB.prepare(`SELECT COUNT(*) AS c FROM fixtures WHERE tenant_id = 'syston' AND opponent = ?`).bind(opponent).first<any>()).c;
    expect(await count("Photo Rovers")).toBe(0);

    // Staff tick both, saying they're the away side in the second
    const apply = (list: unknown[], token = coach.token) => call("/api/v1/club/fixtures/from-image/apply", { token, body: { fixtures: list } });
    expect((await apply([fixtures[0]], parent.token)).status).toBe(403);
    expect((await apply([])).status).toBe(400);
    const added = await apply([fixtures[0], { ...fixtures[1], us: "away" }]);
    expect(added.status).toBe(200);
    expect(added.data.data).toMatchObject({ added: 2 });
    const row = await env.DB.prepare(`SELECT fixture_date, kick_off_time, home_team, away_team, venue, competition, source FROM fixtures WHERE tenant_id = 'syston' AND opponent = 'Photo Rovers'`).first<any>();
    expect(row).toEqual({ fixture_date: "2026-11-07", kick_off_time: "10:30", home_team: "Syston Tigers (test)", away_team: "Photo Rovers", venue: "Syston Park", competition: "Junior Cup", source: "photo" });
    const mystery = await env.DB.prepare(`SELECT home_team, away_team FROM fixtures WHERE tenant_id = 'syston' AND opponent = 'Mystery FC'`).first<any>();
    expect(mystery).toEqual({ home_team: "Mystery FC", away_team: "Syston Tigers (test)" });

    // Adding the same picture's fixtures again adds nothing
    const again = await apply([fixtures[0], { ...fixtures[1], us: "away" }]);
    expect(again.data.data).toMatchObject({ added: 0 });
    expect(await count("Photo Rovers")).toBe(1);

    // Junk in the list is ignored
    expect((await apply([{ date: "whenever", home: "A", away: "B" }])).status).toBe(400);
  });

  it("accepts the model licence once, and explains when reading fails", async () => {
    const coach = await registerAdmin("photo-coach-2");
    const read = () => call("/api/v1/club/fixtures/from-image", { token: coach.token, body: PNG, headers: { "content-type": "image/png" } });
    let agreed = false;
    setAi({
      run: async (_model, input) => {
        if (input.prompt === "agree") { agreed = true; return { response: "ok" }; }
        if (!agreed) throw new Error("5016: Prior to using this model, you must submit the prompt 'agree'");
        return { response: '{"fixtures":[]}' };
      },
    });
    const first = await read();
    expect(first.status).toBe(200);
    expect(agreed).toBe(true);
    expect(first.data.data.fixtures).toEqual([]);

    setAi({ run: async () => { throw new Error("upstream timeout"); } });
    const failed = await read();
    expect(failed.status).toBe(502);
    expect(failed.data.error.message).toMatch(/try again/i);
    setAi(undefined);
  });
});
