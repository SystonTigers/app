/**
 * Draws the Studio designs for a few clubs with different colours, for
 * checking by eye. Usage: tsx scripts/studio-dev.ts <outDir> [photo.jpg]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas, svgDocument } from "../src/services/graphics/svg";
import { svgToJpeg } from "../src/services/graphics/renderer";
import { sampleGraphics, sampleImages } from "../src/services/graphics/samples";
import { drawStudio } from "../src/services/graphics/studio";
import type { Brand, Graphic } from "../src/services/graphics/types";

const outDir = process.argv[2] ?? "studio-preview";
const photoPath = process.argv[3];
const fontDir = path.join(path.dirname(new URL(import.meta.url).pathname), "../src/services/graphics/fonts");

const CLUBS: Array<[string, Partial<Brand>]> = [
  ["syston", { clubName: "Syston Tigers", primaryColor: "#FFD21F", secondaryColor: "#0B0B0C" }],
  ["thurmaston", { clubName: "Thurmaston Magpies", primaryColor: "#1E4FA3", secondaryColor: "#FFFFFF", badgeUrl: "sample:away-badge" }],
  ["anstey", { clubName: "Anstey Nomads", primaryColor: "#C8102E", secondaryColor: "#0B0B0C" }],
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  const wasm = readFileSync(path.join(fontDir, "../resvg.wasm"));
  const fonts = ["Anton-Regular", "BarlowCondensed-SemiBold", "BarlowCondensed-ExtraBold", "BebasNeue-Regular", "ArchivoBlack-Regular"]
    .map((f) => new Uint8Array(readFileSync(path.join(fontDir, `${f}.ttf`))));
  const { Resvg } = await import("@resvg/resvg-wasm");
  await svgToJpeg("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>", { wasm, fonts });
  const images = await sampleImages(async (svg) => `data:image/png;base64,${Buffer.from(new Resvg(svg, { font: { fontBuffers: fonts, loadSystemFonts: false } }).render().asPng()).toString("base64")}`);
  if (photoPath) images.set("sample:photo", `data:image/jpeg;base64,${readFileSync(photoPath).toString("base64")}`);
  for (const [id, over] of CLUBS) {
    const base = sampleGraphics();
    const brand: Brand = { ...base.goal.brand, ...over };
    const all = sampleGraphics(brand);
    const only = process.env.ONLY?.split(",");
    const cases = Object.entries(all).map(([name, g]) => [name, name === "goal" ? { ...g, shirtNumber: 9 } : name === "hattrick" ? { ...g, shirtNumber: 10 } : g] as [string, Graphic])
      .filter(([name]) => !only || only.includes(name));
    for (const [name, g] of cases) {
      for (const [size, w, h] of [["post", 1080, 1350], ["story", 1080, 1920]] as const) {
        const c = createCanvas(images);
        const body = drawStudio(c, g, { w, h, credit: true });
        if (!body) continue;
        const svg = svgDocument(w, h, c, body);
        const started = Date.now();
        const jpeg = await svgToJpeg(svg, { wasm, fonts });
        writeFileSync(path.join(outDir, `${id}-${name}-${size}.jpg`), jpeg);
        console.log(`${id}-${name}-${size}.jpg ${Math.round(jpeg.length / 1024)}KB ${Date.now() - started}ms`);
      }
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
