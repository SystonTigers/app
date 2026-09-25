/**
 * Turns an SVG into a JPEG (Instagram only accepts JPEG) with resvg (WASM)
 * and a pure-JS JPEG encoder. Takes the WASM module and fonts as inputs so it
 * runs the same in the Worker and in Node scripts/tests.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
// The encoder alone (the package's index also pulls in the decoder)
import encodeJpeg from "jpeg-js/lib/encoder.js";

let ready: Promise<void> | null = null;

export interface RendererAssets {
  /** resvg's index_bg.wasm, as a compiled module (Worker) or bytes (Node) */
  wasm: WebAssembly.Module | BufferSource;
  fonts: Uint8Array[];
}

async function ensureWasm(wasm: RendererAssets["wasm"]): Promise<void> {
  if (!ready) {
    ready = initWasm(wasm as Parameters<typeof initWasm>[0]).catch((err: unknown) => {
      // A second init in the same isolate throws; anything else is a real failure
      if (err instanceof Error && /already initialized/i.test(err.message)) return;
      ready = null;
      throw err;
    });
  }
  await ready;
}

/** Render an SVG to JPEG bytes. */
export async function svgToJpeg(svg: string, assets: RendererAssets, quality = 88): Promise<Uint8Array<ArrayBuffer>> {
  await ensureWasm(assets.wasm);
  const resvg = new Resvg(svg, {
    font: { fontBuffers: assets.fonts, loadSystemFonts: false, defaultFontFamily: "Barlow Condensed SemiBold" },
    background: "#000000",
  });
  const image = resvg.render();
  const encoded = encodeJpeg({ data: image.pixels, width: image.width, height: image.height }, quality);
  image.free();
  resvg.free();
  return new Uint8Array(encoded.data);
}
