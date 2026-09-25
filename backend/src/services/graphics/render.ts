/**
 * Draws a post's graphic in the Worker: loads its pictures, builds the SVG in
 * the club's design pack and renders a JPEG. The resvg WASM and fonts are
 * bundled with the Worker (see the [[rules]] in wrangler.toml).
 */
// A copy of @resvg/resvg-wasm/index_bg.wasm (same version as package.json); kept here so the
// Worker bundler and the Workers test runtime both find it. Update with: npm run graphics:wasm
import resvgWasm from "./resvg.wasm";
import anton from "./fonts/Anton-Regular.ttf";
import barlowSemi from "./fonts/BarlowCondensed-SemiBold.ttf";
import barlowExtra from "./fonts/BarlowCondensed-ExtraBold.ttf";
import bebas from "./fonts/BebasNeue-Regular.ttf";
import { loadImages, type ImageEnv } from "./images";
import { drawGraphic, type Pack } from "./packs";
import { svgToJpeg } from "./renderer";
import { imageUrls, type Graphic } from "./types";

const FONTS = [anton, barlowSemi, barlowExtra, bebas].map((f) => new Uint8Array(f));

/** Render a graphic in a pack to JPEG bytes. */
export async function renderGraphic(env: ImageEnv, pack: Pack, graphic: Graphic, fetchImpl: typeof fetch = fetch): Promise<Uint8Array<ArrayBuffer>> {
  const images = await loadImages(env, imageUrls(graphic), fetchImpl);
  const svg = drawGraphic(pack, graphic, images);
  return svgToJpeg(svg, { wasm: resvgWasm, fonts: FONTS });
}
