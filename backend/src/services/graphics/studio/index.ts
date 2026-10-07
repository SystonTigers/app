/**
 * The Studio designs: layouts rebuilt from the club's Canva set, drawn in
 * each club's own colours and crest, as posts (1080×1350) or stories
 * (1080×1920).
 */
import type { Canvas } from "../svg";
import type { Graphic } from "../types";
import { studioLeaders, studioList, studioScore, studioTable } from "./board";
import { studioFixture } from "./fixture";
import { studioLineup, studioMoment, studioPerson, studioPhoto, studioQuote } from "./people";
import { posterGoal, type Frame } from "./poster";

export type { Frame };

export function drawStudio(c: Canvas, g: Graphic, f: Frame): string {
  switch (g.layout) {
    case "moment": return g.kind === "goal" ? posterGoal(c, g, f) : studioMoment(c, g, f);
    case "fixture": return studioFixture(c, g, f);
    case "score": return studioScore(c, g, f);
    case "list": return studioList(c, g, f);
    case "table": return studioTable(c, g, f);
    case "leaders": return studioLeaders(c, g, f);
    case "lineup": return studioLineup(c, g, f);
    case "person": return studioPerson(c, g, f);
    case "quote": return studioQuote(c, g, f);
    case "photo": return studioPhoto(c, g, f);
  }
}
