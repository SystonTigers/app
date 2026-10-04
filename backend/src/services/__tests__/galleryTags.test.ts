import { describe, it, expect } from "vitest";
import { MAX_TAGS, readTagIds } from "../galleryTags";

describe("readTagIds", () => {
  it("keeps each player once", () => {
    expect(readTagIds({ playerIds: ["a", "b", "a"] })).toEqual(["a", "b"]);
    expect(readTagIds({ playerIds: [] })).toEqual([]);
  });

  it("refuses anything that isn't a list of ids", () => {
    expect(readTagIds({})).toMatch(/squad/);
    expect(readTagIds({ playerIds: "a" })).toMatch(/squad/);
    expect(readTagIds({ playerIds: ["a", 3] })).toMatch(/squad/);
    expect(readTagIds({ playerIds: [""] })).toMatch(/squad/);
    expect(readTagIds({ playerIds: Array.from({ length: MAX_TAGS + 1 }, (_, i) => `p${i}`) })).toMatch(/up to/);
  });
});
