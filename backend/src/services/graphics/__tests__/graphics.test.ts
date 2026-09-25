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
const fonts = ["Anton-Regular", "BarlowCondensed-SemiBold", "BarlowCondensed-ExtraBold", "BebasNeue-Regular"]
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
        expect(svg, `${pack.id}/${name}`).toContain(graphic.headline.toUpperCase().replace(/'/g, "&apos;"));
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

  it("falls back to the default pack for unknown ids", () => {
    expect(getPack("nope").id).toBe("touchline");
  });
});

describe("rendering", () => {
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
