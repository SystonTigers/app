/**
 * Journey: a player links their account and writes their own bio; everyone
 * at the club sees their page with stats by season. Photos and goal clips
 * show to other members only once a parent has said yes; staff can take a
 * bio down but not write one.
 */
import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember, TENANT } from "./helpers";

let n = 0;
const tap = () => `pp-${Date.now()}-${++n}`;

async function signUpPlayer() {
  const email = `pp-player-${Date.now()}-${++n}@example.com`;
  const res = await call("/api/v1/auth/register", {
    body: { ageConfirmed: true, tenant_id: TENANT, email, password: "SecurePass123!", profile: { name: "Pat Player", requestedRole: "player" } },
    headers: { "Idempotency-Key": `reg-${email}` },
  });
  return { token: res.data.data.token as string };
}

describe("Player pages", () => {
  it("bio by the player, stats by season, photos and goal clips with consent", async () => {
    const coach = await registerAdmin("pp-coach", "coach");
    const supporter = await registerMember("pp-supporter");
    const player = await signUpPlayer();
    const pat = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Pat Player", squadNumber: 9, position: "Forward" } })).data.playerId as string;

    expect((await call(`/api/v1/players/${pat}/profile`)).status).toBe(401);
    expect((await call("/api/v1/players/nobody/profile", { token: supporter.token })).status).toBe(404);

    // Not linked yet: can't write the bio
    expect((await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: player.token, body: { bio: "Hi" } })).status).toBe(403);
    const code = (await call(`/api/v1/players/${pat}/parent-invite`, { method: "POST", token: coach.token, body: {} })).data.data.code;
    // The coach's code lets the waiting player straight in, with a new sign-in
    const linked = await call("/api/v1/link-child", { token: player.token, body: { code } });
    expect(linked.status).toBe(200);
    expect(linked.data.data.letIn).toBe(true);
    player.token = linked.data.data.token;
    expect((await call("/api/v1/me/players", { token: player.token })).data.data).toEqual([{ id: pat, name: "Pat Player", isMe: true, hasBio: false }]);

    const unsafe = await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: player.token, body: { bio: "Add me on insta @pat9" } });
    expect(unsafe.status).toBe(400);
    expect((await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: player.token, body: { bio: "  Striker. Left foot.  " } })).data.data.bio).toBe("Striker. Left foot.");

    // Staff can take it down but not write it
    expect((await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: coach.token, body: { bio: "Written by coach" } })).status).toBe(403);
    expect((await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: supporter.token, body: { bio: "" } })).status).toBe(403);

    // A goal in Match Centre with the match video lined up
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Page Rovers", date: "2026-09-20", time: "10:00", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;
    const t0 = Date.now() - 12 * 60_000;
    const post = (body: Record<string, unknown>, s: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), occurredAt: t0 + s * 1000, ...body } });
    await post({ type: "kick_off" }, 0);
    await post({ type: "goal", playerId: pat, minute: 4 }, 240);
    await post({ type: "full_time" }, 600);
    await call(`/api/v1/fixtures/${fixtureId}/stream`, { method: "PUT", token: coach.token, body: { url: "https://youtu.be/abcdefghijk" } });
    await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { kickoffSec: 30 } });
    await env.DB.prepare(`INSERT INTO player_images (id, tenant_id, player_id, image_url, image_type, uploaded_at, uploaded_by) VALUES (?, ?, ?, ?, 'action', ?, 'coach')`)
      .bind(`img-${pat}`, TENANT, pat, "https://media.test/pat.jpg", Date.now()).run();

    // The player sees everything on their own page
    const own = (await call(`/api/v1/players/${pat}/profile`, { token: player.token })).data.data;
    expect(own).toMatchObject({ bio: "Striker. Left foot.", canEditBio: true, canRemoveBio: false, hidden: { photos: false, clips: false } });
    expect(own.player).toMatchObject({ name: "Pat Player", number: 9, position: "Forward" });
    expect(own.career).toMatchObject({ goals: 1, appearances: 1 });
    expect(own.seasons.find((s: any) => s.id === "2026-27")).toMatchObject({ goals: 1, appearances: 1, current: true });
    expect(own.photos).toEqual([{ id: `img-${pat}`, url: "https://media.test/pat.jpg", type: "action" }]);
    expect(own.clips).toHaveLength(1);
    expect(own.clips[0]).toMatchObject({ fixtureId, opponent: "Page Rovers", minute: 4, videoId: "abcdefghijk", start: 30 + 240 - 30, end: 30 + 240 + 8 });

    // Other members: bio and stats, but no photos or clips without a parent's yes
    let other = (await call(`/api/v1/players/${pat}/profile`, { token: supporter.token })).data.data;
    expect(other).toMatchObject({ bio: "Striker. Left foot.", canEditBio: false, photos: [], clips: [], hidden: { photos: true, clips: true } });
    expect(other.player.photo).toBeNull();
    expect(other.career.goals).toBe(1);

    await call(`/api/v1/players/${pat}/consent`, { method: "PUT", token: coach.token, body: { photos: true, video: true } });
    other = (await call(`/api/v1/players/${pat}/profile`, { token: supporter.token })).data.data;
    expect(other.photos).toHaveLength(1);
    expect(other.clips).toHaveLength(1);

    // A hidden highlight isn't on the page either
    const momentId = other.clips[0].id;
    expect((await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { moment: { id: momentId, hidden: true } } })).status).toBe(200);
    expect((await call(`/api/v1/players/${pat}/profile`, { token: supporter.token })).data.data.clips).toEqual([]);

    // Staff take the bio down
    const staffView = (await call(`/api/v1/players/${pat}/profile`, { token: coach.token })).data.data;
    expect(staffView).toMatchObject({ canEditBio: false, canRemoveBio: true });
    expect((await call(`/api/v1/players/${pat}/bio`, { method: "PUT", token: coach.token, body: { bio: "" } })).data.data.bio).toBeNull();
    expect((await call(`/api/v1/players/${pat}/profile`, { token: supporter.token })).data.data.bio).toBeNull();
  });
});
