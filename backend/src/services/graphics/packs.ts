/**
 * Design packs clubs choose from. Free packs carry a small "Made with Boost
 * Huddle" credit; premium packs are unlocked per club (a one-off purchase).
 */
import { footer, header, type DrawContext } from "./layouts/common";
import { drawLeaders, drawList, drawPerson, drawPhoto, drawQuote, drawTable } from "./layouts/club";
import { drawFixture, drawLineup, drawMoment, drawScore } from "./layouts/match";
import { drawStudio } from "./studio";
import { drawTemplate, templateImageUrls, type TemplateSet } from "./templates";
import { systonCanva } from "./templates/syston";
import { createCanvas, svgDocument } from "./svg";
import type { Theme } from "./theme";
import { elite } from "./themes/elite";
import { floodlights } from "./themes/floodlights";
import { touchline } from "./themes/touchline";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH, imageUrls, type Graphic, type ImageMap } from "./types";

export interface Pack {
  id: string;
  name: string;
  description: string;
  premium: boolean;
  theme: Theme;
  /** Drawn by the Studio layouts (studio/) instead of the theme's shared layouts */
  studio?: boolean;
  /** A club's own designs (templates/): only offered to clubs whose tenants.graphics_templates names it */
  templates?: TemplateSet;
}

export const PACKS: Pack[] = [
  { id: "syston-canva", name: "Our own designs", description: "The club's own Canva designs, filled in automatically. Posts without a design of their own use Matchday.", premium: false, theme: touchline, studio: true, templates: systonCanva },
  { id: "matchday", name: "Matchday", description: "Bold posters and a floodlit stadium in your club's colours and crest, with the scorer's shirt number.", premium: false, theme: touchline, studio: true },
  { id: "touchline", name: "Touchline", description: "Black with torn brush edges and halftone dots in your club colour.", premium: false, theme: touchline },
  { id: "floodlights", name: "Floodlights", description: "A floodlit stadium at night with glowing headlines.", premium: false, theme: floodlights },
  { id: "elite", name: "Elite", description: "Bold diagonal split in your colours with stacked outline headlines. No Boost Huddle credit.", premium: true, theme: elite },
];

export const DEFAULT_PACK = "touchline";

/** Premium packs a plan includes without buying them: Pro includes them all. */
export function packsIncludedWith(plan: string | null | undefined): string[] {
  return plan === "pro" ? PACKS.filter((p) => p.premium).map((p) => p.id) : [];
}

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
  if (pack.templates) {
    const own = drawTemplate(pack.templates, c, g, images);
    if (own) return svgDocument(own.w, own.h, c, own.svg);
  }
  // A club's own designs don't carry the Boost Huddle credit, even on the Matchday fallbacks
  if (pack.studio) return svgDocument(GRAPHIC_WIDTH, GRAPHIC_HEIGHT, c, drawStudio(c, g, { w: GRAPHIC_WIDTH, h: GRAPHIC_HEIGHT, credit: !pack.premium && !pack.templates }));
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
    case "leaders": body = drawLeaders(d, g); break;
    case "person": body = drawPerson(d, g); break;
    case "quote": body = drawQuote(d, g); break;
    case "photo": body = drawPhoto(d, g); break;
  }
  const svg = t.background(c, g, p) + header(d, g, pill(g)) + body + footer(d, g) + t.overlay(c, g, p);
  return svgDocument(GRAPHIC_WIDTH, GRAPHIC_HEIGHT, c, svg);
}

/** Every image a post needs in this pack: the graphic's own plus a club design's background. */
export function packImageUrls(pack: Pack, g: Graphic): string[] {
  return [...imageUrls(g), ...(pack.templates ? templateImageUrls(pack.templates, g) : [])];
}

/** Packs a club can choose: everyone's, plus its own designs if it has some. */
export function packsFor(templateSet: string | null | undefined): Pack[] {
  return PACKS.filter((p) => !p.templates || p.templates.id === templateSet);
}
