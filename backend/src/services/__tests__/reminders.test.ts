import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/email", () => ({
    sendEventReminderEmail: vi.fn(async () => undefined),
}));

import { sendEventReminders } from "../reminders";
import { sendEventReminderEmail } from "../../lib/email";

type Row = Record<string, unknown>;

/** Minimal D1 mock: answers each prepare() by matching the SQL text. */
function makeEnv(data: { matches?: Row[]; events?: Row[]; attendees?: Row[] }) {
    const binds: unknown[][] = [];
    const prepare = vi.fn((sql: string) => ({
        bind: (...args: unknown[]) => {
            binds.push(args);
            return {
                all: async () => {
                    if (sql.includes("FROM matches")) return { results: data.matches ?? [] };
                    if (sql.includes("FROM events")) return { results: data.events ?? [] };
                    return { results: data.attendees ?? [] };
                },
            };
        },
    }));
    return { env: { DB: { prepare } }, binds, prepare };
}

describe("Reminders Service", () => {
    beforeEach(() => {
        vi.mocked(sendEventReminderEmail).mockClear();
    });

    it("returns ok with zero items when nothing is scheduled tomorrow", async () => {
        const { env } = makeEnv({});
        const result = await sendEventReminders(env, "tenant-a");

        expect(result).toEqual({ ok: true, sent: 0 });
        expect(sendEventReminderEmail).not.toHaveBeenCalled();
    });

    it("scopes match and event queries to the tenant", async () => {
        const { env, binds } = makeEnv({});
        await sendEventReminders(env, "tenant-a");

        expect(binds[0][0]).toBe("tenant-a");
        expect(binds[1][0]).toBe("tenant-a");
    });

    it("emails parents of selected players for a match", async () => {
        const { env } = makeEnv({
            matches: [{ id: "m1", opponent: "Rovers", date_utc: 1_800_000_000, venue: "Home", tenant_id: "tenant-a" }],
            attendees: [
                { parent_email: "parent@example.com", name: "Sam" },
                { parent_email: null, name: "No Email" },
            ],
        });

        const result = await sendEventReminders(env, "tenant-a");

        expect(result).toEqual({ ok: true, sent: 1 });
        expect(sendEventReminderEmail).toHaveBeenCalledTimes(1);
        const args = vi.mocked(sendEventReminderEmail).mock.calls[0];
        expect(args[0]).toBe("parent@example.com");
        expect(args[2]).toBe("Match vs Rovers");
        expect(args[4]).toBe("Home");
    });

    it("uses the event title and TBC venue for events", async () => {
        const { env } = makeEnv({
            events: [{ id: "e1", title: "Presentation Night", start_time: 1_800_000_000, tenant_id: "tenant-a" }],
            attendees: [{ parent_email: "p@example.com", name: "Alex" }],
        });

        await sendEventReminders(env, "tenant-a");

        const args = vi.mocked(sendEventReminderEmail).mock.calls[0];
        expect(args[2]).toBe("Presentation Night");
        expect(args[4]).toBe("TBC");
    });
});
