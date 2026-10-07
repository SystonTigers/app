/**
 * Draws every post type in a club's own designs, using background files from
 * a local folder, for checking by eye. Usage:
 *   tsx scripts/templates-dev.ts <set id> <backgrounds dir> <out dir> [player-cutout.png]
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { drawGraphic, PACKS } from "../src/services/graphics/packs";
import { svgToJpeg } from "../src/services/graphics/renderer";
import { sampleGraphics, sampleImages } from "../src/services/graphics/samples";
import type { Graphic } from "../src/services/graphics/types";

const [setId, bgDir, outDir, cutout] = process.argv.slice(2);
const fontDir = path.join(path.dirname(new URL(import.meta.url).pathname), "../src/services/graphics/fonts");

async function main() {
  const pack = PACKS.find((p) => p.templates?.id === setId);
  if (!pack) throw new Error(`No pack uses template set ${setId}`);
  mkdirSync(outDir, { recursive: true });
  const wasm = readFileSync(path.join(fontDir, "../resvg.wasm"));
  const fonts = ["Anton-Regular", "BarlowCondensed-SemiBold", "BarlowCondensed-ExtraBold", "BebasNeue-Regular", "ArchivoBlack-Regular"]
    .map((f) => new Uint8Array(readFileSync(path.join(fontDir, `${f}.ttf`))));
  const { Resvg } = await import("@resvg/resvg-wasm");
  await svgToJpeg("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>", { wasm, fonts });
  const images = await sampleImages(async (svg) => `data:image/png;base64,${Buffer.from(new Resvg(svg, { font: { fontBuffers: fonts, loadSystemFonts: false } }).render().asPng()).toString("base64")}`);
  if (cutout) images.set("sample:photo", `data:image/png;base64,${readFileSync(cutout).toString("base64")}`);
  for (const file of readdirSync(bgDir)) images.set(`r2:graphics/templates/${setId}/${file}`, `data:image/jpeg;base64,${readFileSync(path.join(bgDir, file)).toString("base64")}`);
  const samples = sampleGraphics();
  const extra: Record<string, Graphic> = {
    brace: { ...(samples.goal as Graphic), headline: "BRACE!", goalCount: 2, shirtNumber: 9 } as Graphic,
    goal: { ...(samples.goal as Graphic), shirtNumber: 9 } as Graphic,
    hattrick: { ...(samples.hattrick as Graphic), shirtNumber: 9, photoUrl: "sample:photo" } as Graphic,
    oppgoal: { ...(samples.goal as Graphic), kind: "opp_goal", headline: "GOAL", playerName: "Hillside Rangers", secondary: null, photoUrl: null } as Graphic,
  };
  for (const [name, g] of Object.entries({ ...samples, ...extra })) {
    const svg = drawGraphic(pack, g, images);
    writeFileSync(path.join(outDir, `${name}.jpg`), await svgToJpeg(svg, { wasm, fonts }));
    console.log(name);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
