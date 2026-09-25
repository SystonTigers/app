/** What a design pack controls: colours, fonts and how its shapes are drawn. */
import type { Canvas } from "./svg";
import type { FontName } from "./text";
import type { Brand, Graphic } from "./types";

export interface Palette {
  /** Page background */
  bg: string;
  /** Main text on the background */
  ink: string;
  /** Secondary text on the background */
  muted: string;
  /** The club colour, made readable on the background */
  accent: string;
  /** Text on the accent colour */
  accentInk: string;
  /** The score and "V" inside the score panel */
  scoreInk: string;
  /** Boxes such as table rows */
  panel: string;
  panelInk: string;
  /** Thin dividers */
  line: string;
}

export interface Theme {
  id: string;
  fonts: { display: FontName; strong: FontName; body: FontName };
  palette(brand: Brand): Palette;
  /** Everything behind the content */
  background(c: Canvas, g: Graphic, p: Palette): string;
  /** Anything drawn over the content (frames, grain) */
  overlay(c: Canvas, g: Graphic, p: Palette): string;
  /** Big headline centred on cx with its baseline at y. Returns the SVG and the font size used. */
  headline(c: Canvas, value: string, cx: number, y: number, maxWidth: number, maxSize: number, p: Palette): { svg: string; size: number };
  /** The box that holds the badges and score */
  scorePanel(c: Canvas, x: number, y: number, w: number, h: number, p: Palette): string;
  /** Draw badges on white tiles (true) or straight onto the panel (false) */
  badgeTiles: boolean;
  /** A player or team photo in a box */
  photo(c: Canvas, url: string, x: number, y: number, w: number, h: number, p: Palette): string;
  /** A team name bar in fixture and result lists; `side` says which way it leans */
  bar(c: Canvas, x: number, y: number, w: number, h: number, p: Palette, side: "left" | "right"): string;
  /** A row box in lists and tables */
  row(c: Canvas, x: number, y: number, w: number, h: number, p: Palette, highlight: boolean): string;
}
