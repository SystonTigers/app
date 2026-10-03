import { describe, it, expect } from "vitest";
import { MAX_BIO, readBio } from "../playerProfile/bio";

describe("player bios", () => {
  it("tidies spacing and keeps short paragraphs", () => {
    expect(readBio("  Left back.   Love a   slide tackle.\n\n\n\nSupport Leicester.  ")).toEqual({ bio: "Left back. Love a slide tackle.\n\nSupport Leicester." });
    expect(readBio("")).toEqual({ bio: "" });
  });

  it("refuses contact details, links and social media names", () => {
    for (const bad of [
      "Follow me https://tiktok.com/@me", "see www.mysite.co", "check mysite.com", "email me sam@example.com",
      "insta @sam_skills", "call 07700 900123", "snapchat: samm", "add me on whatsapp - 0770",
    ]) {
      expect(readBio(bad), bad).toHaveProperty("error");
    }
  });

  it("allows normal football talk, including scores and shirt numbers", () => {
    for (const ok of ["Scored 12 goals in 2025-26, number 9.", "Won 3-1 vs Oadby @ home", "Favourite player: Jamie Vardy"]) {
      expect(readBio(ok), ok).toHaveProperty("bio");
    }
  });

  it("limits the length and needs text", () => {
    expect(readBio("a".repeat(MAX_BIO))).toHaveProperty("bio");
    expect(readBio("a".repeat(MAX_BIO + 1))).toHaveProperty("error");
    expect(readBio(42)).toHaveProperty("error");
  });
});
