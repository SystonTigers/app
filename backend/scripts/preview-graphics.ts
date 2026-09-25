/**
 * Draws every layout in every design pack with sample data, for checking
 * designs by eye. Usage: npm run graphics:preview -- [outDir] [pack]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { drawGraphic, PACKS } from "../src/services/graphics/packs";
import { svgToJpeg } from "../src/services/graphics/renderer";
import { imageUrls, type Graphic } from "../src/services/graphics/types";
import { sampleGraphics, sampleImages } from "../src/services/graphics/samples";

const outDir = process.argv[2] ?? "graphics-preview";
const onlyPack = process.argv[3];
const fontDir = path.join(path.dirname(new URL(import.meta.url).pathname), "../src/services/graphics/fonts");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const wasm = readFileSync(path.join(fontDir, "../resvg.wasm"));
  const fonts = ["Anton-Regular", "BarlowCondensed-SemiBold", "BarlowCondensed-ExtraBold", "BebasNeue-Regular"]
    .map((f) => new Uint8Array(readFileSync(path.join(fontDir, `${f}.ttf`))));
  const images = await sampleImages((svg) => svgToPng(svg, wasm, fonts));
  for (const pack of PACKS.filter((p) => !onlyPack || p.id === onlyPack)) {
    for (const [name, graphic] of Object.entries(sampleGraphics())) {
      const started = Date.now();
      const svg = drawGraphic(pack, graphic as Graphic, new Map(imageUrls(graphic as Graphic).map((u) => [u, images.get(u) ?? null])));
      const jpeg = await svgToJpeg(svg, { wasm, fonts });
      writeFileSync(path.join(outDir, `${pack.id}-${name}.jpg`), jpeg);
      console.log(`${pack.id}-${name}.jpg ${Math.round(jpeg.length / 1024)}KB ${Date.now() - started}ms`);
    }
  }
}

/** Sample badges are drawn as SVG and turned into PNG data URIs. */
async function svgToPng(svg: string, wasm: Buffer, fonts: Uint8Array[]): Promise<string> {
  const { Resvg } = await import("@resvg/resvg-wasm");
  await svgToJpeg("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>", { wasm, fonts });
  const png = new Resvg(svg, { font: { fontBuffers: fonts, loadSystemFonts: false } }).render().asPng();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
