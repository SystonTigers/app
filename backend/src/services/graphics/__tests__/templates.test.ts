import { describe, expect, it } from "vitest";
import { drawGraphic, getPack, packImageUrls, packsFor } from "../packs";
import { sampleGraphics } from "../samples";
import { backgroundUrl, getTemplateSet } from "../templates";
import { isCutOut } from "../templates/parts";
import { loadImages } from "../images";
import type { Graphic } from "../types";

const samples = sampleGraphics();
const pack = getPack("syston-canva");
const set = getTemplateSet("syston-canva")!;
const BG = "data:image/jpeg;base64,/9j/AAAA";

/** Every background this set uses, "loaded". */
function withBackgrounds(g: Graphic) {
  return new Map(packImageUrls(pack, g).map((u) => [u, u.startsWith("r2:") ? BG : null]));
}

describe("a club's own designs", () => {
  it("are only offered to the club that owns them", () => {
    expect(packsFor(null).some((p) => p.id === "syston-canva")).toBe(false);
    expect(packsFor("syston-canva").some((p) => p.id === "syston-canva")).toBe(true);
    expect(packsFor("someone-else").some((p) => p.id === "syston-canva")).toBe(false);
  });

  it("picks the right background for each post", () => {
    const file = (g: Graphic) => set.pick(g)?.file ?? null;
    expect(file(samples.goal)).toBe("goal.jpg");
    expect(file({ ...samples.goal, goalCount: 2 } as Graphic)).toBe("brace.jpg");
    expect(file(samples.hattrick)).toBe("hattrick.jpg");
    expect(file(samples.halftime)).toBe("halftime.jpg");
    expect(file(samples.fulltime)).toBe("fulltime.jpg");
    expect(file(samples.matchday)).toBe("matchday.jpg");
    expect(file(samples.results)).toBe("results.jpg");
    expect(file(samples.fixtures)).toBe("fixtures.jpg");
    expect(file(samples.table)).toBe("table.jpg");
    expect(file(samples.lineup)).toBe("lineup.jpg");
    // No design of its own: falls back to Matchday
    expect(file(samples.card)).toBeNull();
    expect(file(samples.birthday)).toBeNull();
  });

  it("fills a design with the post's details on its background, without the Boost Huddle credit", () => {
    const g = { ...samples.goal, shirtNumber: 9 } as Graphic;
    const svg = drawGraphic(pack, g, withBackgrounds(g));
    expect(svg).toContain(`href="${BG}"`);
    expect(svg).toMatch(/width="1080" height="1080"/);
    for (const s of ["GOAL!", "SAM S.", "23&apos;", "SYSTON TIGERS", "HILLSIDE RANGERS", "2-1", ">9<"]) expect(svg).toContain(s);
    expect(svg).not.toContain("MADE WITH BOOST HUDDLE");
  });

  it("falls back to Matchday when the background can't be loaded or there's no design", () => {
    expect(drawGraphic(pack, samples.goal, new Map())).toMatch(/width="1080" height="1350"/);
    const card = drawGraphic(pack, samples.card, withBackgrounds(samples.card));
    expect(card).toMatch(/width="1080" height="1350"/);
    expect(card).not.toContain("MADE WITH BOOST HUDDLE");
  });

  it("only reads design backgrounds straight from storage", async () => {
    const reads: string[] = [];
    const R2_MEDIA = { get: async (key: string) => { reads.push(key); return { size: 4, arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer } as unknown as R2ObjectBody; } } as unknown as R2Bucket;
    const images = await loadImages({ R2_MEDIA }, [backgroundUrl(set, set.pick(samples.goal)!), "r2:sponsors/other-club/logo.png", "r2:graphics/templates/../secret.jpg"]);
    expect(reads).toEqual(["graphics/templates/syston-canva/goal.jpg"]);
    expect([...images.values()].filter(Boolean)).toHaveLength(1);
  });

  it("tells a cut-out (see-through PNG) from an ordinary photo", () => {
    const png = (colourType: number) => {
      const bytes = new Uint8Array(33);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 0);
      bytes[25] = colourType;
      return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
    };
    expect(isCutOut(png(6))).toBe(true);
    expect(isCutOut(png(2))).toBe(false);
    expect(isCutOut("data:image/jpeg;base64,/9j/")).toBe(false);
  });
});
