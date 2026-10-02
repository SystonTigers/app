/**
 * Turns what the image reader wrote back into fixtures we can trust. The
 * model is asked for JSON, but anything it says is checked here: dates must
 * be real, times are 24-hour, team names are short plain text. Pure functions.
 */
import type { FaEmailFixture } from "../faEmail/parse";

export interface ReadFixture {
  date?: unknown;
  time?: unknown;
  home?: unknown;
  away?: unknown;
  venue?: unknown;
  competition?: unknown;
  status?: unknown;
}

const MAX_FIXTURES = 40;
const MAX_NAME = 80;

/** The first JSON object or array in the reply (models sometimes wrap it in prose or ```). */
export function extractJson(reply: string): unknown {
  const text = reply.replace(/```(?:json)?/gi, "");
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  // Walk to the matching bracket so trailing chatter is ignored
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  return name && name.length <= MAX_NAME && /[a-z]/i.test(name) ? name : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function realDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
}

/**
 * "2026-10-04", "4/10/2026", "04/10", "--10-04" (no year): fixtures are UK
 * dates (day first). With no year, the next time that day comes round,
 * allowing a few weeks back for a fixture list that's partly played.
 */
export function normaliseDate(value: unknown, today: Date): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return realDate(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return realDate(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  // No year: "--10-04" (as the reader is asked to write it) or a UK "4/10"
  let month: number | null = null;
  let day: number | null = null;
  const noYearIso = v.match(/^--(\d{1,2})-(\d{1,2})$/);
  const noYearUk = v.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (noYearIso) { month = +noYearIso[1]; day = +noYearIso[2]; }
  else if (noYearUk) { day = +noYearUk[1]; month = +noYearUk[2]; }
  if (month === null || day === null) return null;
  const year = today.getUTCFullYear();
  for (const y of [year, year + 1]) {
    const date = realDate(y, month, day);
    if (!date) continue;
    const ageDays = (today.getTime() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000;
    if (ageDays <= 45) return date;
  }
  return realDate(year + 1, month, day);
}

/** "14:00", "2pm", "10.30", "2:30 PM" → "HH:MM" (24-hour) */
export function normaliseTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (!m[2] && !m[3]) return null; // a lone number isn't a time
  return h <= 23 && min <= 59 ? `${pad(h)}:${pad(min)}` : null;
}

function status(value: unknown): FaEmailFixture["status"] {
  const s = typeof value === "string" ? value.toLowerCase() : "";
  if (s.includes("postpone")) return "postponed";
  if (s.includes("cancel") || s.includes("abandon") || s.includes("void")) return "cancelled";
  return "scheduled";
}

/** The model's reply as fixtures, keeping only ones with a real date and two teams. */
export function fixturesFromReply(reply: string, today = new Date()): FaEmailFixture[] {
  const parsed = extractJson(reply);
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { fixtures?: unknown })?.fixtures) ? (parsed as { fixtures: unknown[] }).fixtures : [];
  const out: FaEmailFixture[] = [];
  const seen = new Set<string>();
  for (const item of list.slice(0, MAX_FIXTURES * 2)) {
    if (!item || typeof item !== "object") continue;
    const r = item as ReadFixture;
    const date = normaliseDate(r.date, today);
    const homeTeam = cleanName(r.home);
    const awayTeam = cleanName(r.away);
    if (!date || !homeTeam || !awayTeam || homeTeam.toLowerCase() === awayTeam.toLowerCase()) continue;
    const key = `${date}|${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const st = status(r.status);
    out.push({
      date,
      time: normaliseTime(r.time),
      homeTeam,
      awayTeam,
      status: st,
      statusText: st === "scheduled" ? null : st,
      venue: cleanName(r.venue),
      competition: cleanName(r.competition),
      faFixtureId: null,
    });
    if (out.length >= MAX_FIXTURES) break;
  }
  return out;
}
