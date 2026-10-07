import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drawGraphic, getPack, PACKS } from "../packs";
import { svgToJpeg } from "../renderer";
import { sampleGraphics } from "../samples";
import { fitSize, initials, inkOn, measure, truncate, wrap } from "../text";
import { imageMime } from "../images";
import { imageUrls, type Graphic } from "../types";

const dir = path.join(__dirname, "..");
const fonts = ["Anton-Regular", "BarlowCondensed-SemiBold", "BarlowCondensed-ExtraBold", "BebasNeue-Regular", "ArchivoBlack-Regular"]
  .map((f) => new Uint8Array(readFileSync(path.join(dir, "fonts", `${f}.ttf`))));
const wasm = readFileSync(path.join(dir, "resvg.wasm"));

describe("text fitting", () => {
  it("measures with the real font widths", () => {
    expect(measure("WWWW", "Anton", 100)).toBeGreaterThan(measure("iiii", "Anton", 100));
    expect(measure("GOAL", "Anton", 200)).toBeCloseTo(measure("GOAL", "Anton", 100) * 2, 5);
  });

  it("shrinks, wraps and cuts text to fit", () => {
    const size = fitSize("THE LONGEST TEAM NAME IN THE LEAGUE", "Anton", 120, 10, 400);
    expect(measure("THE LONGEST TEAM NAME IN THE LEAGUE", "Anton", size)).toBeLessThanOrEqual(400);
    const block = wrap("Hard work beats talent when talent doesn't work hard.", "Barlow Condensed ExtraBold", 90, 40, 500, 4);
    expect(block.lines.length).toBeLessThanOrEqual(4);
    block.lines.forEach((l) => expect(measure(l, "Barlow Condensed ExtraBold", block.size)).toBeLessThanOrEqual(500));
    expect(truncate("Hillside Rangers Under Twelves", "Anton", 40, 200)).toMatch(/…$/);
  });

  it("makes badge initials and readable ink", () => {
    expect(initials("Hillside Rangers FC")).toBe("HR");
    expect(initials("Anstey")).toBe("AN");
    expect(inkOn("#FFD21F")).toBe("#0B0B0C");
    expect(inkOn("#0B2545")).toBe("#FFFFFF");
  });
});

describe("design packs", () => {
  const samples = sampleGraphics();

  it("draws every post type in every pack with the details it was given", () => {
    for (const pack of PACKS) {
      for (const [name, graphic] of Object.entries(samples)) {
        const svg = drawGraphic(pack, graphic, new Map());
        expect(svg, `${pack.id}/${name}`).toMatch(/^<svg /);
        expect(svg, `${pack.id}/${name}`).not.toMatch(/undefined|NaN/);
        // Some designs stack the headline one word per line
        for (const word of graphic.headline.toUpperCase().replace(/'/g, "&apos;").split(" ")) expect(svg, `${pack.id}/${name}`).toContain(word);
        // Free packs carry the credit; premium ones don't
        expect(svg.includes("MADE WITH BOOST HUDDLE"), `${pack.id}/${name}`).toBe(!pack.premium);
      }
    }
  });

  it("shows both teams, the score and our scorers with minutes at full time", () => {
    const svg = drawGraphic(getPack("touchline"), samples.fulltime, new Map());
    expect(svg).toContain("SYSTON TIGERS");
    expect(svg).toContain("HILLSIDE RANGERS");
    expect(svg).toContain("3-1");
    expect(svg).toContain("SAM S. 23&apos;, 41&apos;");
  });

  it("uses initials when an opponent has no badge, and the badge when it loads", () => {
    const g = samples.matchday as Graphic;
    expect(drawGraphic(getPack("touchline"), g, new Map())).toContain(">HR<");
    const withBadge = drawGraphic(getPack("touchline"), g, new Map(imageUrls(g).map((u) => [u, "data:image/png;base64,AAAA"])));
    expect(withBadge).toContain("data:image/png;base64,AAAA");
  });

  it("Matchday draws the scorer's shirt number and each club's own colours", () => {
    const goal = { ...(samples.goal as Graphic), shirtNumber: 9 } as Graphic;
    const svg = drawGraphic(getPack("matchday"), goal, new Map());
    expect(svg).toMatch(/>9<\/text>/);
    const blue = sampleGraphics({ ...samples.goal.brand, clubName: "Thurmaston Magpies", primaryColor: "#1E4FA3", secondaryColor: "#FFFFFF" }).goal;
    expect(drawGraphic(getPack("matchday"), blue, new Map())).toContain("#1E4FA3");
    expect(drawGraphic(getPack("matchday"), samples.goal, new Map())).not.toContain("#1E4FA3");
  });

  it("Matchday leaves out the kick-off time and ground when the post has none", () => {
    const g = { ...(samples.matchday as Graphic), time: null, venue: null } as Graphic;
    const svg = drawGraphic(getPack("matchday"), g, new Map());
    expect(svg).not.toContain("10:30");
    expect(svg).not.toContain("SYSTON PARK");
    expect(drawGraphic(getPack("matchday"), samples.matchday, new Map())).toContain("SYSTON PARK");
  });

  it("falls back to the default pack for unknown ids", () => {
    expect(getPack("nope").id).toBe("touchline");
  });
});

describe("rendering", () => {
  it("renders the Matchday designs (filters, masks and photos) to JPEG", async () => {
    const photo = new Map(imageUrls(sampleGraphics().goal).map((u) => [u, null]));
    for (const name of ["goal", "matchday", "fulltime", "table"] as const) {
      const jpeg = await svgToJpeg(drawGraphic(getPack("matchday"), sampleGraphics()[name], photo), { wasm, fonts });
      expect([jpeg[0], jpeg[1], jpeg[2]], name).toEqual([0xff, 0xd8, 0xff]);
    }
  }, 60_000);

  it("renders a graphic to a JPEG", async () => {
    const svg = drawGraphic(getPack("floodlights"), sampleGraphics().goal, new Map());
    const jpeg = await svgToJpeg(svg, { wasm, fonts });
    expect([jpeg[0], jpeg[1], jpeg[2]]).toEqual([0xff, 0xd8, 0xff]);
    expect(jpeg.length).toBeGreaterThan(20_000);
  }, 20_000);

  it("only accepts pictures the renderer can draw", () => {
    expect(imageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(imageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageMime(new TextEncoder().encode("RIFF....WEBP"))).toBeNull();
    expect(imageMime(new TextEncoder().encode("<svg"))).toBeNull();
  });
});
