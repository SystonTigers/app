/**
 * A club's own designs: background artwork exported from the club's Canva
 * set (placeholders removed), with the live details drawn on top where the
 * placeholders were. Backgrounds live in R2 under
 * `graphics/templates/<set id>/<file>` and are listed per club in
 * `tenants.graphics_templates`. Post types without a design of their own fall
 * back to the Matchday layouts.
 */
import type { Canvas } from "../svg";
import type { Graphic, ImageMap } from "../types";
import { systonCanva } from "./syston";

export interface Template {
  /** Background file name in the set's R2 folder */
  file: string;
  w: number;
  h: number;
  /** Everything drawn over the background */
  draw(c: Canvas, g: Graphic): string;
}

export interface TemplateSet {
  id: string;
  /** Which design a post uses, or null to fall back to Matchday */
  pick(g: Graphic): Template | null;
}

export const TEMPLATE_SETS: TemplateSet[] = [systonCanva];

export function getTemplateSet(id: string | null | undefined): TemplateSet | null {
  return TEMPLATE_SETS.find((s) => s.id === id) ?? null;
}

/** Where a background is kept (read straight from R2 by the image loader). */
export function backgroundUrl(set: TemplateSet, t: Template): string {
  return `r2:graphics/templates/${set.id}/${t.file}`;
}

/** The background and overlays for a post, or null when this set has no design for it (or its background didn't load). */
export function drawTemplate(set: TemplateSet, c: Canvas, g: Graphic, images: ImageMap): { svg: string; w: number; h: number } | null {
  const t = set.pick(g);
  if (!t) return null;
  const bg = images.get(backgroundUrl(set, t));
  if (!bg) return null;
  const svg = `<image href="${bg}" x="0" y="0" width="${t.w}" height="${t.h}" preserveAspectRatio="xMidYMid slice"/>` + t.draw(c, g);
  return { svg, w: t.w, h: t.h };
}

/** Extra images a post needs from its template set (its background). */
export function templateImageUrls(set: TemplateSet, g: Graphic): string[] {
  const t = set.pick(g);
  return t ? [backgroundUrl(set, t)] : [];
}
