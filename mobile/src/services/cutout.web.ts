/**
 * Web app: make a player's cut-out (a see-through PNG of just them) from an
 * ordinary photo, on this device. Nothing is uploaded until staff save it.
 *
 * Google's MediaPipe image segmenter (Apache 2.0) with its multi-class selfie
 * model (also Apache 2.0) finds the person: hair, skin and kit, so raised
 * arms and boots come out whole; utils/cutoutMask.ts keeps the main one and snaps the
 * edge to the photo's own outline. The library, its WebAssembly and the model are copied to
 * /mediapipe/ by scripts/build-web.mjs and only downloaded the first time a
 * coach makes a cut-out (about 28 MB, then cached by the browser).
 */
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { planCutout, refineAlpha } from '../utils/cutoutMask';

const BASE = '/mediapipe';
/** The model's labels: 0 is background, the rest (hair, skin, clothes, accessories) are the person */
const BACKGROUND = 0;
/** Photos are shrunk to this before finding the player (long side, pixels) */
const WORK_SIZE = 2048;
/** The saved cut-out's longest side at most */
const OUTPUT_SIZE = 1200;

export interface Cutout {
  blob: Blob;
  /** An object URL for previewing; call URL.revokeObjectURL when done */
  url: string;
  width: number;
  height: number;
}

type Vision = typeof import('@mediapipe/tasks-vision');

let segmenter: Promise<ImageSegmenter> | null = null;

/** Load the library from our own site at run time, so the app's bundle stays small. */
function loadVision(): Promise<Vision> {
  // eslint-disable-next-line no-new-func
  const load = new Function('url', 'return import(url)') as (url: string) => Promise<Vision>;
  return load(`${BASE}/vision_bundle.mjs`);
}

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenter) {
    segmenter = (async () => {
      const vision = await loadVision();
      const files = await vision.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      return vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${BASE}/selfie_multiclass_256x256.tflite`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })();
    // A failed download can be tried again next time
    segmenter.catch(() => { segmenter = null; });
  }
  return segmenter;
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error("This browser can't make cut-outs. Try Chrome or Safari.");
  return ctx;
}

/** The photo, upright and shrunk to WORK_SIZE. */
async function photoCanvas(file: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    throw new Error("That photo couldn't be opened. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, WORK_SIZE / Math.max(bitmap.width, bitmap.height));
  const c = canvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  context(c).drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c;
}

/** Make a cut-out from a photo. Throws an Error with a message staff can act on. */
export async function makeCutout(file: Blob): Promise<Cutout> {
  const [photo, seg] = await Promise.all([
    photoCanvas(file),
    getSegmenter().catch(() => { throw new Error("The background remover didn't load. Check your signal and try again."); }),
  ]);

  const result = seg.segment(photo);
  let mask: { width: number; height: number; data: Float32Array };
  try {
    const background = result.confidenceMasks?.[BACKGROUND];
    if (!background) throw new Error("We couldn't find a player in that photo.");
    const data = background.getAsFloat32Array().slice();
    for (let i = 0; i < data.length; i++) data[i] = 1 - data[i];
    mask = { width: background.width, height: background.height, data };
  } finally {
    result.close();
  }

  const plan = planCutout(mask);
  if ('problem' in plan) throw new Error(plan.problem);

  // Stretch the mask over the photo and snap it to the photo's own edges
  const ctx = context(photo);
  const image = ctx.getImageData(0, 0, photo.width, photo.height);
  const px = image.data;
  const guide = new Float32Array(photo.width * photo.height);
  for (let i = 0; i < guide.length; i++) guide[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  const alpha = refineAlpha(plan.alpha, mask.width, mask.height, guide, photo.width, photo.height);
  for (let i = 0; i < alpha.length; i++) px[i * 4 + 3] = alpha[i];
  ctx.putImageData(image, 0, 0);

  // Crop to the player and keep it a sensible size
  const sx = photo.width / mask.width;
  const sy = photo.height / mask.height;
  const box = { x: Math.floor(plan.box.x * sx), y: Math.floor(plan.box.y * sy), width: Math.ceil(plan.box.width * sx), height: Math.ceil(plan.box.height * sy) };
  const scale = Math.min(1, OUTPUT_SIZE / Math.max(box.width, box.height));
  const out = canvas(Math.max(1, Math.round(box.width * scale)), Math.max(1, Math.round(box.height * scale)));
  const outCtx = context(out);
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(photo, box.x, box.y, box.width, box.height, 0, 0, out.width, out.height);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error("The cut-out couldn't be saved on this device. Try again.");
  return { blob, url: URL.createObjectURL(blob), width: out.width, height: out.height };
}
