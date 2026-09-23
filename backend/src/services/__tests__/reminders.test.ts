import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/email", () => ({
    sendEventReminderEmail: vi.fn(async () => undefined),
}));

import { sendEventReminders } from "../reminders";
import { sendEventReminderEmail } from "../../lib/email";

type Row = Record<string, unknown>;

/** Minimal D1 mock: answers each prepare() by matching the SQL text. */
function makeEnv(data: { fixtures?: Row[]; events?: Row[]; parents?: Row[]; attendees?: Row[] }) {
    const binds: Array<{ sql: string; args: unknown[] }> = [];
    const prepare = vi.fn((sql: string) => ({
        bind: (...args: unknown[]) => {
            binds.push({ sql, args });
            return {
                first: async () => ({ name: "Syston Tigers" }),
                all: async () => {
                    if (sql.includes("FROM fixtures")) return { results: data.fixtures ?? [] };
                    if (sql.includes("FROM calendar_events")) return { results: data.events ?? [] };
                    if (sql.includes("FROM squad")) return { results: data.parents ?? [] };
                    if (sql.includes("FROM event_rsvps")) return { results: data.attendees ?? [] };
                    return { results: [] };
                },
            };
        },
    }));
    return { env: { DB: { prepare } }, binds };
}

const NOW = new Date("2026-09-25T10:00:00Z"); // tomorrow = 2026-09-26

describe("Reminders Service", () => {
    beforeEach(() => {
        vi.mocked(sendEventReminderEmail).mockClear();
    });

    it("sends nothing when nothing is on tomorrow", async () => {
        const { env } = makeEnv({});
        const result = await sendEventReminders(env, "tenant-a", NOW);

        expect(result).toEqual({ ok: true, sent: 0 });
        expect(sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it("scopes queries to the tenant and tomorrow's date", async () => {
        const { env, binds } = makeEnv({});
        await sendEventReminders(env, "tenant-a", NOW);

        const fixtureQuery = binds.find((b) => b.sql.includes("FROM fixtures"))!;
        expect(fixtureQuery.args).toEqual(["tenant-a", "2026-09-26"]);
        const eventQuery = binds.find((b) => b.sql.includes("FROM calendar_events"))!;
        expect(eventQuery.args).toEqual(["tenant-a", "2026-09-26"]);
    });

    it("emails every parent on file about a fixture", async () => {
        const { env } = makeEnv({
            fixtures: [{ id: "f1", opponent: "Rovers", fixture_date: "2026-09-26", kick_off_time: "10:30", venue: "Home" }],
            parents: [
                { parent_email: "a@example.com", name: "Sam" },
                { parent_email: "b@example.com", name: "Alex" },
            ],
        });

        const result = await sendEventReminders(env, "tenant-a", NOW);

        expect(result).toEqual({ ok: true, sent: 2 });
        const args = vi.mocked(sendEventReminderEmail).mock.calls[0];
        expect(args[0]).toBe("a@example.com");
        expect(args[2]).toBe("Match vs Rovers");
        expect(args[3]).toBe("2026-09-26 10:30");
        expect(args[5]).toBe("Syston Tigers");
    });

    it("emails members who RSVP'd to a calendar event", async () => {
        const { env } = makeEnv({
            events: [{ id: "e1", title: "Presentation Night", start_time: "2026-09-26T19:00", location: null }],
            attendees: [{ email: "p@example.com" }, { email: null }],
        });

        const result = await sendEventReminders(env, "tenant-a", NOW);

        expect(result.sent).toBe(1);
        const args = vi.mocked(sendEventReminderEmail).mock.calls[0];
        expect(args[2]).toBe("Presentation Night");
        expect(args[4]).toBe("TBC");
    });
});
