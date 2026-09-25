/**
 * Design packs clubs choose from. Free packs carry a small "Made with Boost
 * Huddle" credit; premium packs are unlocked per club (a one-off purchase).
 */
import { footer, header, type DrawContext } from "./layouts/common";
import { drawList, drawPerson, drawPhoto, drawQuote, drawTable } from "./layouts/club";
import { drawFixture, drawLineup, drawMoment, drawScore } from "./layouts/match";
import { createCanvas, svgDocument } from "./svg";
import type { Theme } from "./theme";
import { elite } from "./themes/elite";
import { floodlights } from "./themes/floodlights";
import { touchline } from "./themes/touchline";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH, type Graphic, type ImageMap } from "./types";

export interface Pack {
  id: string;
  name: string;
  description: string;
  premium: boolean;
  theme: Theme;
}

export const PACKS: Pack[] = [
  { id: "touchline", name: "Touchline", description: "Black with torn brush edges and halftone dots in your club colour.", premium: false, theme: touchline },
  { id: "floodlights", name: "Floodlights", description: "A floodlit stadium at night with glowing headlines.", premium: false, theme: floodlights },
  { id: "elite", name: "Elite", description: "Bold diagonal split in your colours with stacked outline headlines. No Boost Huddle credit.", premium: true, theme: elite },
];

export const DEFAULT_PACK = "touchline";

export function getPack(id: string | null | undefined): Pack {
  return PACKS.find((p) => p.id === id) ?? (PACKS.find((p) => p.id === DEFAULT_PACK) as Pack);
}

/** The header pill for a graphic: the minute for match moments. */
function pill(g: Graphic): string | null {
  if ((g.layout === "moment" || g.layout === "score") && g.minute !== null) return `${g.minute}'`;
  return null;
}

/** Build the SVG for a graphic in a pack. Images must already be loaded into `images`. */
export function drawGraphic(pack: Pack, g: Graphic, images: ImageMap): string {
  const c = createCanvas(images);
  const t = pack.theme;
  const p = t.palette(g.brand);
  const d: DrawContext = { c, t, p, watermark: !pack.premium };
  let body: string;
  switch (g.layout) {
    case "moment": body = drawMoment(d, g); break;
    case "score": body = drawScore(d, g); break;
    case "fixture": body = drawFixture(d, g); break;
    case "lineup": body = drawLineup(d, g); break;
    case "list": body = drawList(d, g); break;
    case "table": body = drawTable(d, g); break;
    case "person": body = drawPerson(d, g); break;
    case "quote": body = drawQuote(d, g); break;
    case "photo": body = drawPhoto(d, g); break;
  }
  const svg = t.background(c, g, p) + header(d, g, pill(g)) + body + footer(d, g) + t.overlay(c, g, p);
  return svgDocument(GRAPHIC_WIDTH, GRAPHIC_HEIGHT, c, svg);
}
