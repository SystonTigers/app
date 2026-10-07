// Copies the background remover for player cut-outs (src/services/cutout.web.ts)
// into a web build: Google's MediaPipe library and WebAssembly from
// node_modules, and the multi-class selfie segmentation model (Apache 2.0) from web/mediapipe.
// Only downloaded by the app when a coach makes a cut-out.
import { cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function copyMediapipe(dist) {
  const lib = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
  const out = path.join(dist, 'mediapipe');
  cpSync(path.join(root, 'web', 'mediapipe'), out, { recursive: true });
  cpSync(path.join(lib, 'vision_bundle.mjs'), path.join(out, 'vision_bundle.mjs'));
  for (const file of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
    cpSync(path.join(lib, 'wasm', file), path.join(out, 'wasm', file));
  }
}
