import { describe, it, expect, vi } from "vitest";
import { sendEventReminders } from "../reminders";

describe("Reminders Service", () => {
    describe("sendEventReminders", () => {
        it("returns success response", async () => {
            const mockEnv = {};
            const result = await sendEventReminders(mockEnv);

            expect(result).toEqual({ ok: true });
        });

        it("handles different env configurations", async () => {
            const envWithKV = { KV: {} };
            const result = await sendEventReminders(envWithKV);

            expect(result).toEqual({ ok: true });
        });

        it("can be called multiple times", async () => {
            const mockEnv = {};

            const result1 = await sendEventReminders(mockEnv);
            const result2 = await sendEventReminders(mockEnv);

            expect(result1).toEqual({ ok: true });
            expect(result2).toEqual({ ok: true });
        });
    });
});
