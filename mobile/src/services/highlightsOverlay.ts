/**
 * What's drawn on a highlights video: a scoreboard (both teams, the score at
 * that moment and the minute), a caption as each moment starts, and a title
 * card with the result. Plain canvas drawing, no react-native imports.
 */

export interface OverlayTeam {
  name: string;
  color: string;
}

export interface OverlayMatch {
  home: OverlayTeam;
  away: OverlayTeam;
  /** True when the club posting is the home side */
  usIsHome: boolean;
  /** Final score (home, away), or null if unknown */
  final: { home: number; away: number } | null;
  date: string;
  clubName: string;
}

export interface OverlayMoment {
  /** Seconds into the recording */
  tapAt: number;
  /** When the caption appears (seconds into the recording) */
  captionFrom: number;
  title: string;
  detail: string | null;
  minute: number | null;
  scoreBefore: { us: number; them: number };
  scoreAfter: { us: number; them: number };
}

/** A stretch of the recording to use, with the moments in it. */
export interface OverlaySpan {
  start: number;
  end: number;
  moments: OverlayMoment[];
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const TITLE_SECONDS = 3;
const CAPTION_SECONDS = 4;

/** Group overlapping clips so no footage is shown twice; each group keeps its moments. */
export function overlaySpans(clips: Array<{ start: number; end: number; moment: Omit<OverlayMoment, 'captionFrom'> }>): OverlaySpan[] {
  const sorted = clips.filter((c) => c.end > c.start).sort((a, b) => a.start - b.start);
  const spans: OverlaySpan[] = [];
  for (const c of sorted) {
    const last = spans[spans.length - 1];
    // Caption just as the moment happens (taps come a second or two after), fully inside the clip
    const moment = { ...c.moment, captionFrom: Math.max(0, c.start, Math.min(c.moment.tapAt - 2, c.end - CAPTION_SECONDS)) };
    if (last && c.start <= last.end) {
      last.end = Math.max(last.end, c.end);
      last.moments.push(moment);
    } else {
      spans.push({ start: Math.max(0, c.start), end: c.end, moments: [moment] });
    }
  }
  return spans;
}

/** The score and minute to show at `t` (seconds into the recording) inside a span. */
export function scoreAt(span: OverlaySpan, t: number): { us: number; them: number; minute: number | null } {
  let current = { ...span.moments[0].scoreBefore, minute: span.moments[0].minute };
  for (const m of span.moments) {
    if (t >= m.tapAt) current = { ...m.scoreAfter, minute: m.minute };
    else break;
  }
  return current;
}

/** The caption to show at `t`, if any. */
export function captionAt(span: OverlaySpan, t: number): OverlayMoment | null {
  let found: OverlayMoment | null = null;
  for (const m of span.moments) if (t >= m.captionFrom && t < m.captionFrom + CAPTION_SECONDS) found = m;
  return found;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

const FONT = '"Helvetica Neue", Arial, sans-serif';

/** Scoreboard (top left) and caption (bottom) over a frame that's already drawn. */
export function drawOverlay(ctx: Ctx, width: number, height: number, match: OverlayMatch, span: OverlaySpan, t: number): void {
  const u = Math.min(width, height) / 1080; // scale everything to the video's size (upright phone videos too)
  const s = scoreAt(span, t);
  const [homeGoals, awayGoals] = match.usIsHome ? [s.us, s.them] : [s.them, s.us];

  // Scoreboard: [colour] HOME  2 - 1  AWAY [colour]  23'
  const pad = 28 * u;
  const barH = 64 * u;
  const nameW = 300 * u;
  const scoreW = 150 * u;
  const minuteW = s.minute !== null ? 100 * u : 0;
  const x = 40 * u;
  const y = 40 * u;
  const total = nameW * 2 + scoreW + minuteW + 16 * u;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#101418';
  roundRect(ctx, x, y, total, barH, 12 * u);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = match.home.color;
  ctx.fillRect(x, y, 10 * u, barH);
  ctx.fillStyle = match.away.color;
  ctx.fillRect(x + nameW * 2 + scoreW + 6 * u, y, 10 * u, barH);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${30 * u}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(fit(ctx, match.home.name.toUpperCase(), nameW - pad - 10 * u), x + pad, y + barH / 2);
  ctx.textAlign = 'right';
  ctx.fillText(fit(ctx, match.away.name.toUpperCase(), nameW - pad - 10 * u), x + nameW * 2 + scoreW - 10 * u, y + barH / 2);
  ctx.fillStyle = '#FFD21F';
  ctx.fillRect(x + nameW, y, scoreW, barH);
  ctx.fillStyle = '#101418';
  ctx.textAlign = 'center';
  ctx.font = `900 ${38 * u}px ${FONT}`;
  ctx.fillText(`${homeGoals} - ${awayGoals}`, x + nameW + scoreW / 2, y + barH / 2 + 2 * u);
  if (s.minute !== null) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${28 * u}px ${FONT}`;
    ctx.fillText(`${s.minute}'`, x + nameW * 2 + scoreW + 16 * u + minuteW / 2, y + barH / 2);
  }

  // Caption as each moment starts
  const cap = captionAt(span, t);
  if (cap) {
    const cw = Math.min(width - 80 * u, 1100 * u);
    const ch = cap.detail ? 130 * u : 96 * u;
    const cx = 40 * u;
    const cy = height - ch - 60 * u;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#101418';
    roundRect(ctx, cx, cy, cw, ch, 14 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = match.usIsHome ? match.home.color : match.away.color;
    ctx.fillRect(cx, cy, 14 * u, ch);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${50 * u}px ${FONT}`;
    ctx.fillText(fit(ctx, cap.title.toUpperCase(), cw - 70 * u), cx + 40 * u, cy + (cap.detail ? 50 * u : ch / 2));
    if (cap.detail) {
      ctx.fillStyle = '#C8CDD2';
      ctx.font = `600 ${32 * u}px ${FONT}`;
      ctx.fillText(fit(ctx, cap.detail, cw - 70 * u), cx + 40 * u, cy + 100 * u);
    }
  }
  ctx.restore();
}

/** The opening card: HIGHLIGHTS, the teams, the result and the date. */
export function drawTitleCard(ctx: Ctx, width: number, height: number, match: OverlayMatch): void {
  const u = Math.min(width, height) / 1080;
  const upright = height > width;
  ctx.save();
  ctx.fillStyle = '#0B0D0F';
  ctx.fillRect(0, 0, width, height);
  const us = match.usIsHome ? match.home : match.away;
  ctx.fillStyle = us.color;
  ctx.fillRect(0, 0, width, 16 * u);
  ctx.fillRect(0, height - 16 * u, width, 16 * u);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD21F';
  ctx.font = `900 ${64 * u}px ${FONT}`;
  ctx.fillText('MATCH HIGHLIGHTS', width / 2, height * 0.22);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${56 * u}px ${FONT}`;
  if (upright) {
    // Upright video: teams above and below the score
    ctx.fillText(fit(ctx, match.home.name.toUpperCase(), width * 0.9), width / 2, height * 0.4);
    ctx.fillText(fit(ctx, match.away.name.toUpperCase(), width * 0.9), width / 2, height * 0.6);
  } else {
    ctx.fillText(fit(ctx, match.home.name.toUpperCase(), width * 0.36), width * 0.27, height * 0.5);
    ctx.fillText(fit(ctx, match.away.name.toUpperCase(), width * 0.36), width * 0.73, height * 0.5);
  }
  ctx.font = `900 ${120 * u}px ${FONT}`;
  ctx.fillText(match.final ? `${match.final.home} - ${match.final.away}` : 'v', width / 2, height * 0.5);
  ctx.fillStyle = '#C8CDD2';
  ctx.font = `600 ${38 * u}px ${FONT}`;
  ctx.fillText(match.date, width / 2, height * 0.72);
  ctx.restore();
}
