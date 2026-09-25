/**
 * Draws the graphic for an automatic post (goal, half time, team news...) on
 * the manager's phone and returns it as a JPEG (Instagram only accepts JPEG).
 * Web app only: it needs a browser canvas. Returns null anywhere else.
 */
import type { GraphicSpec } from './liveMatch';

const W = 1080;
const H = 1350;
const DISPLAY = '"Arial Black", "Helvetica Neue", Impact, sans-serif';
const BODY = '"Helvetica Neue", Arial, sans-serif';

function loadImage(url: string | null, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

/** Largest font size (down to min) at which the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, max: number, min: number, width: number): number {
  let size = max;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= width) break;
    size -= 4;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cover-fit an image into a box (like CSS object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 3, sw, sh, x, y, w, h);
}

/** Pick readable text for a background colour. */
function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#0B0D0F';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? '#0B0D0F' : '#FFFFFF';
}

function draw(ctx: CanvasRenderingContext2D, spec: GraphicSpec, photo: HTMLImageElement | null, badge: HTMLImageElement | null) {
  const accent = spec.primaryColor || '#00E5E5';
  const ink = '#FFFFFF';

  // Background with a bold diagonal band in the club colour
  ctx.fillStyle = '#0B0D0F';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(W * 0.62, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.42);
  ctx.lineTo(W * 0.3, H);
  ctx.lineTo(W * 0.02, H);
  ctx.closePath();
  ctx.globalAlpha = 0.14;
  ctx.fill();
  ctx.restore();

  // Header: badge, club name, minute
  let x = 64;
  if (badge) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(64 + 48, 96, 48, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, badge, 64, 48, 96, 96);
    ctx.restore();
    x = 64 + 96 + 24;
  }
  ctx.fillStyle = ink;
  fit(ctx, spec.clubName.toUpperCase(), DISPLAY, '900', 40, 24, W - x - 220);
  ctx.textBaseline = 'middle';
  ctx.fillText(spec.clubName.toUpperCase(), x, 96);
  if (spec.minute !== null) {
    const label = `${spec.minute}'`;
    ctx.font = `900 44px ${DISPLAY}`;
    const w = ctx.measureText(label).width + 48;
    ctx.fillStyle = accent;
    roundRect(ctx, W - 64 - w, 66, w, 64, 32);
    ctx.fill();
    ctx.fillStyle = inkFor(accent);
    ctx.fillText(label, W - 64 - w + 24, 99);
  }

  if (spec.players && spec.players.length) {
    drawLineup(ctx, spec, accent, ink);
  } else {
    drawMoment(ctx, spec, photo, accent, ink);
  }

  // Score band
  const bandY = H - 250;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, bandY, W, 170);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  const score = `${spec.homeScore} – ${spec.awayScore}`;
  ctx.font = `900 96px ${DISPLAY}`;
  const scoreW = ctx.measureText(score).width;
  const showScore = spec.kind !== 'lineup';
  if (showScore) {
    ctx.fillStyle = accent;
    ctx.fillText(score, (W - scoreW) / 2, bandY + 88);
  }
  ctx.fillStyle = ink;
  const side = showScore ? (W - scoreW) / 2 - 48 : W / 2 - 40;
  fit(ctx, spec.homeName.toUpperCase(), DISPLAY, '900', 40, 22, side - 64);
  ctx.textAlign = 'right';
  ctx.fillText(spec.homeName.toUpperCase(), showScore ? (W - scoreW) / 2 - 36 : W / 2 - 30, bandY + 88);
  ctx.textAlign = 'left';
  fit(ctx, spec.awayName.toUpperCase(), DISPLAY, '900', 40, 22, side - 64);
  ctx.fillText(spec.awayName.toUpperCase(), showScore ? (W + scoreW) / 2 + 36 : W / 2 + 30, bandY + 88);
  if (!showScore) {
    ctx.font = `900 40px ${DISPLAY}`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.fillText('v', W / 2, bandY + 88);
    ctx.textAlign = 'left';
  }

  // Footer
  ctx.font = `600 26px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(spec.competition ? spec.competition.toUpperCase() : '', 64, H - 44);
  ctx.textAlign = 'right';
  ctx.fillText('BOOST HUDDLE', W - 64, H - 44);
  ctx.textAlign = 'left';
}

function drawMoment(ctx: CanvasRenderingContext2D, spec: GraphicSpec, photo: HTMLImageElement | null, accent: string, ink: string) {
  const top = 200;
  const bottom = H - 290;
  if (photo) {
    const pw = 560;
    const ph = 700;
    const px = W - 64 - pw;
    ctx.save();
    roundRect(ctx, px, top, pw, ph, 28);
    ctx.clip();
    drawCover(ctx, photo, px, top, pw, ph);
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    roundRect(ctx, px, top, pw, ph, 28);
    ctx.stroke();
  }
  const textW = photo ? W - 64 - 560 - 64 - 40 : W - 128;
  ctx.textBaseline = 'alphabetic';

  // Measure the text block first so it can sit in the middle when there's no photo
  const hSize = fit(ctx, spec.headline, DISPLAY, 'italic 900', photo ? 150 : 200, 60, textW);
  const nSize = spec.playerName ? fit(ctx, spec.playerName.toUpperCase(), DISPLAY, '900', photo ? 72 : 110, 36, textW) : 0;
  const sSize = spec.secondary ? fit(ctx, spec.secondary, BODY, '600', photo ? 44 : 52, 26, textW) : 0;
  const blockH = hSize + (nSize ? 40 + nSize : 0) + (sSize ? 32 + sSize : 0);
  let y = photo ? top : top + Math.max(0, (bottom - top - blockH) / 2);

  ctx.fillStyle = accent;
  fit(ctx, spec.headline, DISPLAY, 'italic 900', photo ? 150 : 200, 60, textW);
  y += hSize;
  ctx.fillText(spec.headline, 64, y);
  if (spec.playerName) {
    ctx.fillStyle = ink;
    fit(ctx, spec.playerName.toUpperCase(), DISPLAY, '900', photo ? 72 : 110, 36, textW);
    y += 40 + nSize;
    ctx.fillText(spec.playerName.toUpperCase(), 64, y);
  }
  if (spec.secondary) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    fit(ctx, spec.secondary, BODY, '600', photo ? 44 : 52, 26, textW);
    y += 32 + sSize;
    ctx.fillText(spec.secondary, 64, y);
  }
}

function drawLineup(ctx: CanvasRenderingContext2D, spec: GraphicSpec, accent: string, ink: string) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  const hSize = fit(ctx, spec.headline, DISPLAY, 'italic 900', 96, 48, W - 128);
  ctx.fillText(spec.headline, 64, 200 + hSize);
  const players = spec.players ?? [];
  const cols = players.length > 7 ? 2 : 1;
  const rows = Math.ceil(players.length / cols);
  const areaTop = 200 + hSize + (spec.secondary ? 110 : 50);
  const rowH = Math.min(78, (H - 280 - areaTop - (spec.subs?.length ? 110 : 0)) / rows);
  const colW = (W - 128) / cols;
  players.forEach((p, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = 64 + col * colW;
    const y = areaTop + row * rowH + rowH * 0.7;
    ctx.fillStyle = accent;
    ctx.font = `900 ${Math.round(rowH * 0.55)}px ${DISPLAY}`;
    ctx.fillText(p.number !== null ? String(p.number) : '–', x, y);
    ctx.fillStyle = ink;
    fit(ctx, p.name.toUpperCase(), DISPLAY, '900', Math.round(rowH * 0.5), 20, colW - 110);
    ctx.fillText(p.name.toUpperCase(), x + 90, y);
  });
  if (spec.subs?.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const text = `SUBS: ${spec.subs.join(', ')}`;
    fit(ctx, text, BODY, '600', 36, 20, W - 128);
    ctx.fillText(text, 64, H - 290);
  }
  if (spec.secondary) {
    ctx.fillStyle = ink;
    fit(ctx, spec.secondary, BODY, '600', 36, 20, W - 128);
    ctx.fillText(spec.secondary, 64, 200 + hSize + 64);
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    } catch {
      // A photo from another site without permission "taints" the canvas
      resolve(null);
    }
  });
}

export function canDrawGraphics(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

export async function renderGraphic(spec: GraphicSpec): Promise<Blob | null> {
  if (!canDrawGraphics()) return null;
  const [photo, badge] = await Promise.all([loadImage(spec.photoUrl), loadImage(spec.badgeUrl)]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, spec, photo, badge);
  const blob = await toJpeg(canvas);
  if (blob || (!photo && !badge)) return blob;
  // Fall back to a graphic without pictures rather than no graphic at all
  draw(ctx, spec, null, null);
  return toJpeg(canvas);
}
