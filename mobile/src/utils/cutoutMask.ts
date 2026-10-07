/**
 * Turning a "how likely is this pixel a person" mask into a clean cut-out:
 * keep the biggest person in the picture (not team-mates behind them), give
 * the edge a soft ramp and find the box to crop to. Pure, so it's tested in
 * node (test/cutoutMask.test.js); the web app runs it on the mask from the
 * background remover (services/cutout.web.ts).
 */

export interface PersonMask {
  width: number;
  height: number;
  /** 0..1 per pixel, row by row */
  data: Float32Array | number[];
}

export interface Box { x: number; y: number; width: number; height: number }

/** Below this share of the picture we say we couldn't find anyone. */
export const MIN_PERSON_SHARE = 0.01;

/** 1 for each pixel in the largest joined-up area above the threshold (4-neighbour), else 0. */
export function largestRegion(mask: PersonMask, threshold = 0.5): { region: Uint8Array; size: number } {
  const { width, height, data } = mask;
  const n = width * height;
  const label = new Int32Array(n);
  const stack = new Int32Array(n);
  let best = 0;
  let bestSize = 0;
  let next = 0;
  for (let start = 0; start < n; start++) {
    if (label[start] || data[start] < threshold) continue;
    next++;
    let size = 0;
    let top = 0;
    stack[top++] = start;
    label[start] = next;
    while (top) {
      const p = stack[--top];
      size++;
      const x = p % width;
      const neighbours = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
      for (const q of neighbours) {
        if (q < 0 || q >= n || label[q] || data[q] < threshold) continue;
        label[q] = next;
        stack[top++] = q;
      }
    }
    if (size > bestSize) { bestSize = size; best = next; }
  }
  const region = new Uint8Array(n);
  if (best) for (let i = 0; i < n; i++) region[i] = label[i] === best ? 1 : 0;
  return { region, size: bestSize };
}

/** Distance (in pixels, chamfer 3-4 / 3) from each pixel to the nearest pixel of the region. */
export function distanceTo(region: Uint8Array, width: number, height: number): Float32Array {
  const n = width * height;
  const d = new Float32Array(n);
  const far = 1e9;
  for (let i = 0; i < n; i++) d[i] = region[i] ? 0 : far;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - width] + 3);
        if (x > 0) v = Math.min(v, d[i - width - 1] + 4);
        if (x < width - 1) v = Math.min(v, d[i - width + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < width - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < height - 1) {
        v = Math.min(v, d[i + width] + 3);
        if (x < width - 1) v = Math.min(v, d[i + width + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + width - 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < n; i++) d[i] /= 3;
  return d;
}

/**
 * See-through-ness for each pixel (0 clear .. 255 solid): solid inside the
 * main person, a soft ramp on the mask's own edge, and nothing further than
 * `reach` pixels from them (so other people and stray blobs disappear).
 */
export function alphaFor(mask: PersonMask, region: Uint8Array, reach: number): Uint8ClampedArray {
  const { width, height, data } = mask;
  const dist = distanceTo(region, width, height);
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < alpha.length; i++) {
    if (dist[i] > reach) continue;
    const ramp = Math.min(1, Math.max(0, (data[i] - 0.3) / 0.4));
    // Fade out towards the edge of the reach too, so nothing ends in a hard line
    const fade = reach > 0 ? Math.min(1, (reach - dist[i]) / Math.max(1, reach / 2)) : 1;
    alpha[i] = Math.round(255 * (region[i] ? Math.max(ramp, 0.85) : ramp * fade));
  }
  return alpha;
}

/** The box around everything visible, with a little space round it, or null if nothing is. */
export function cropBox(alpha: Uint8ClampedArray, width: number, height: number, pad = 0.03, minAlpha = 24): Box | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] < minAlpha) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const px = Math.round((maxX - minX + 1) * pad);
  const py = Math.round((maxY - minY + 1) * pad);
  const x = Math.max(0, minX - px);
  const y = Math.max(0, minY - py);
  // No space under the feet: graphics stand the player on the bottom edge
  const bottom = maxY === height - 1 ? height : Math.min(height, maxY + 1 + Math.round(py / 3));
  return { x, y, width: Math.min(width, maxX + 1 + px) - x, height: bottom - y };
}

/** Everything a cut-out needs from a mask, or a message if there's no clear person in the picture. */
export function planCutout(mask: PersonMask): { alpha: Uint8ClampedArray; box: Box } | { problem: string } {
  const { region, size } = largestRegion(mask);
  if (size < mask.width * mask.height * MIN_PERSON_SHARE) {
    return { problem: "We couldn't find a player in that photo. Try one where they're bigger in the picture." };
  }
  const reach = Math.max(2, Math.round(Math.min(mask.width, mask.height) * 0.015));
  const alpha = alphaFor(mask, region, reach);
  const box = cropBox(alpha, mask.width, mask.height);
  if (!box) return { problem: "We couldn't find a player in that photo. Try one where they're bigger in the picture." };
  return { alpha, box };
}

/** Stretch a small 0..255 alpha map to w×h (bilinear), as 0..1. */
export function upscale(alpha: Uint8ClampedArray, mw: number, mh: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  const sx = mw / w;
  const sy = mh / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(mh - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(mh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(mw - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(mw - 1, x0 + 1);
      const tx = fx - x0;
      const top = alpha[y0 * mw + x0] * (1 - tx) + alpha[y0 * mw + x1] * tx;
      const bottom = alpha[y1 * mw + x0] * (1 - tx) + alpha[y1 * mw + x1] * tx;
      out[y * w + x] = (top * (1 - ty) + bottom * ty) / 255;
    }
  }
  return out;
}

/** Mean of each (2r+1)² square, clipped at the edges (summed-area table). */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const total = sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
      out[y * w + x] = total / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

/**
 * Guided filter (He, Sun and Tang): pulls a blurry mask onto the real edges
 * of the photo (`guide` is its brightness, 0..1), so hair, arms and boots
 * are cut along their outline instead of the mask's coarse blocks.
 */
export function guidedFilter(guide: Float32Array, mask: Float32Array, w: number, h: number, r: number, eps: number): Float32Array {
  const n = w * h;
  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) { ip[i] = guide[i] * mask[i]; ii[i] = guide[i] * guide[i]; }
  const meanI = boxMean(guide, w, h, r);
  const meanP = boxMean(mask, w, h, r);
  const meanIp = boxMean(ip, w, h, r);
  const meanII = boxMean(ii, w, h, r);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const cov = meanIp[i] - meanI[i] * meanP[i];
    const variance = meanII[i] - meanI[i] * meanI[i];
    a[i] = cov / (variance + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  const meanA = boxMean(a, w, h, r);
  const meanB = boxMean(b, w, h, r);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = meanA[i] * guide[i] + meanB[i];
  return out;
}

/**
 * The final see-through-ness at full size: the mask stretched to the photo,
 * snapped to its edges, then firmed up so the edge is crisp but not jagged.
 */
export function refineAlpha(alpha: Uint8ClampedArray, mw: number, mh: number, guide: Float32Array, w: number, h: number): Uint8ClampedArray {
  const big = upscale(alpha, mw, mh, w, h);
  const r = Math.max(2, Math.round(Math.max(w, h) / 160));
  const snapped = guidedFilter(guide, big, w, h, r, 1e-3);
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < out.length; i++) {
    // Never add back what the mask left out, and firm up the middle of the ramp
    const v = Math.min(snapped[i], big[i] + 0.15);
    out[i] = Math.round(255 * Math.min(1, Math.max(0, (v - 0.3) / 0.4)));
  }
  return out;
}
