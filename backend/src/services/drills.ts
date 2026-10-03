/**
 * Club drills, favourites and video links: validation and the shapes the app
 * and website use. Pure functions (tested in Node).
 */

export const DRILL_CATEGORIES = ["Warm-up", "Passing", "Shooting", "Dribbling", "Defending", "Tactical", "Fitness", "Cool-down", "Goalkeeping", "Technical"] as const;
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export type VideoPlatform = "tiktok" | "instagram" | "youtube";

/** A drill the club made. Lists are trimmed and capped. */
export interface DrillInput {
  name: string;
  category: string;
  durationMinutes: number;
  players: string | null;
  difficulty: Difficulty;
  equipment: string[];
  focus: string[];
  description: string;
  setup: string | null;
  steps: string[];
  coachingPoints: string[];
}

/** "lib:drill-012" (built-in) or "club:<uuid>" (training_drills). */
export function isDrillRef(ref: unknown): ref is string {
  return typeof ref === "string" && (/^lib:drill-\d{3}$/.test(ref) || /^club:[0-9a-f-]{36}$/i.test(ref));
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A list from an array or from text with one item per line (or commas for short lists). */
export function list(value: unknown, maxItems: number, maxLength: number, commas = false): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(commas ? /[\n,]/ : /\n/) : [];
  return raw
    .map((item) => text(item, maxLength).replace(/^(\d+[.)]|[-*•])\s+/, ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

/** "15 min", "10-15 mins", 15 → 15 (first number, 1 to 180). */
export function minutes(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(/\d+/.exec(String(value ?? ""))?.[0]);
  return Number.isInteger(n) && n >= 1 && n <= 180 ? n : null;
}

/** Checks a drill from the app or website; returns what to save or why it can't be. */
export function readDrillInput(body: Record<string, unknown>): { value: DrillInput } | { error: string } {
  const name = text(body.name, 80);
  if (!name) return { error: "Give the drill a name." };
  const category = text(body.category, 30);
  if (!(DRILL_CATEGORIES as readonly string[]).includes(category)) return { error: `Choose a category: ${DRILL_CATEGORIES.join(", ")}.` };
  const durationMinutes = minutes(body.durationMinutes ?? body.duration);
  if (!durationMinutes) return { error: "How long does it take? Use minutes between 1 and 180." };
  const difficulty = (DIFFICULTIES as readonly string[]).includes(String(body.difficulty)) ? (body.difficulty as Difficulty) : "intermediate";
  const description = text(body.description, 600);
  const steps = list(body.steps, 12, 200);
  if (!description && !steps.length) return { error: "Add a short description or the steps, so other coaches know how it runs." };
  return {
    value: {
      name,
      category,
      durationMinutes,
      players: text(body.players, 30) || null,
      difficulty,
      equipment: list(body.equipment, 12, 60, true),
      focus: list(body.focus, 8, 30, true),
      description,
      setup: text(body.setup, 600) || null,
      steps,
      coachingPoints: list(body.coachingPoints, 10, 200),
    },
  };
}

/**
 * A TikTok, Instagram or YouTube video link, tidied (tracking removed), or
 * null if it isn't one. Only links are kept; the videos stay on their sites.
 */
export function readVideoLink(raw: unknown): { url: string; platform: VideoPlatform } | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  const path = url.pathname.replace(/\/+$/, "");
  if (host === "tiktok.com" && /^\/@[\w.-]+\/(video|photo)\/\d+$/.test(path)) return { url: `https://www.tiktok.com${path}`, platform: "tiktok" };
  if ((host === "vm.tiktok.com" || host === "vt.tiktok.com") && /^\/[\w-]+$/.test(path)) return { url: `https://${host}${path}/`, platform: "tiktok" };
  if (host === "instagram.com" && /^\/(p|reel|reels|tv)\/[\w-]+$/.test(path)) return { url: `https://www.instagram.com${path.replace("/reels/", "/reel/")}/`, platform: "instagram" };
  if (host === "youtube.com" && path === "/watch" && /^[\w-]{11}$/.test(url.searchParams.get("v") ?? "")) {
    return { url: `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`, platform: "youtube" };
  }
  if (host === "youtube.com" && /^\/shorts\/[\w-]{11}$/.test(path)) return { url: `https://www.youtube.com${path}`, platform: "youtube" };
  if (host === "youtu.be" && /^\/[\w-]{11}$/.test(path)) return { url: `https://www.youtube.com/watch?v=${path.slice(1)}`, platform: "youtube" };
  return null;
}

/** Where to ask for a link's title and picture. Instagram needs a Meta app token, so it has none. */
export function oembedUrl(link: { url: string; platform: VideoPlatform }): string | null {
  if (link.platform === "tiktok") return `https://www.tiktok.com/oembed?url=${encodeURIComponent(link.url)}`;
  if (link.platform === "youtube") return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`;
  return null;
}

/** Parses a stored JSON list, tolerating old plain-text values. */
export function storedList(value: unknown): string[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [value];
  } catch {
    return [value];
  }
}

/** Older drills saved "Difficulty: x" and "Players: y" inside the description. */
export function legacyDescription(description: string): { description: string; difficulty: string | null; players: string | null } {
  const difficulty = /\n?Difficulty: (\w+)/.exec(description)?.[1] ?? null;
  const players = /\n?Players: ([^\n]+)/.exec(description)?.[1]?.trim() ?? null;
  return { description: description.replace(/\n*Difficulty: \w+/, "").replace(/\n*Players: [^\n]+/, "").trim(), difficulty, players };
}
