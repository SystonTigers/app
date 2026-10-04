import { describe, it, expect } from "vitest";
import { isAlwaysOpen, isPaid, trialEndMode, trialOver } from "../trialLock";

const NOW = 1_800_000_000; // seconds
const club = (over: Partial<{ status: string; subscription_status: string | null; trial_ends_at: number | null; comped: number }>) => ({
  status: "trial", subscription_status: "trialing", trial_ends_at: NOW + 86_400, comped: 0, ...over,
});

describe("trial end", () => {
  it("is off unless switched to read_only", () => {
    expect(trialEndMode({})).toBe("off");
    expect(trialEndMode({ TRIAL_END_MODE: "nonsense" })).toBe("off");
    expect(trialEndMode({ TRIAL_END_MODE: "read_only" })).toBe("read_only");
  });

  it("counts a trial as over only when it has ended and the club isn't paying", () => {
    expect(trialOver(club({}), NOW)).toBe(false);
    expect(trialOver(club({ trial_ends_at: NOW - 1 }), NOW)).toBe(true);
    expect(trialOver(club({ trial_ends_at: (NOW - 1) * 1000 }), NOW)).toBe(true); // stored in ms
    expect(trialOver(club({ trial_ends_at: NOW - 1, comped: 1 }), NOW)).toBe(false);
    expect(trialOver(club({ trial_ends_at: NOW - 1, subscription_status: "active" }), NOW)).toBe(false);
    expect(trialOver(club({ trial_ends_at: null }), NOW)).toBe(false);
    expect(isPaid(club({ status: "active" }))).toBe(true);
  });

  it("always lets clubs sign in, pay and reach the owner panel", () => {
    expect(isAlwaysOpen("/api/v1/billing/checkout")).toBe(true);
    expect(isAlwaysOpen("/api/v1/auth/login")).toBe(true);
    expect(isAlwaysOpen("/api/v1/owner/clubs")).toBe(true);
    expect(isAlwaysOpen("/api/v1/results")).toBe(false);
  });
});
