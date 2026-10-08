/**
 * Availability rules that don't touch the database: what an answer looks
 * like, which items are coming up, and the reminder wording. See store.ts.
 */

export const ITEM_TYPES = ["match", "training", "event"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type Answer = "yes" | "no" | "maybe";

/** How far ahead the app lists things to answer. */
export const LOOKAHEAD_DAYS = 28;
/** Families get one automatic reminder when an unanswered item is this close. */
export const REMINDER_DAYS = 2;
/** A coach can send "remind everyone" for an item at most this often. */
export const MANUAL_GAP_MS = 12 * 3_600_000;
export const NOTE_MAX = 120;

export class AvailabilityError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export function isItemType(v: unknown): v is ItemType {
  return typeof v === "string" && (ITEM_TYPES as readonly string[]).includes(v);
}

/** The body of PUT .../players/:id: { status: yes|no|maybe|null, note? }. null clears the answer. */
export function readAnswer(body: unknown): { status: Answer | null; note: string | null } {
  if (!body || typeof body !== "object") throw new AvailabilityError(400, "BAD_REQUEST", "Send { status: \"yes\" | \"no\" | \"maybe\" }.");
  const b = body as Record<string, unknown>;
  const raw = b.status === "available" ? "yes" : b.status === "unavailable" ? "no" : b.status;
  if (raw !== null && raw !== "yes" && raw !== "no" && raw !== "maybe") {
    throw new AvailabilityError(400, "BAD_REQUEST", "Status must be yes, no or maybe.");
  }
  let note: string | null = null;
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== "string") throw new AvailabilityError(400, "BAD_REQUEST", "The note must be text.");
    note = b.note.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX) || null;
  }
  return { status: raw as Answer | null, note: raw === null ? null : note };
}

/** YYYY-MM-DD in the UK for a moment, and n days later. */
export function ukDate(now: Date, plusDays = 0): string {
  const d = new Date(now.getTime() + plusDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "HH:MM" from a stored time or datetime, or null. */
export function timeOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /(?:^|[T ])(\d{1,2}):(\d{2})/.exec(value);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** "Sat 11 Oct" */
export function shortDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** "Sam" / "Sam and Jo" (first names) */
export function firstNames(names: string[]): string {
  const list = [...new Set(names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean))];
  if (list.length <= 1) return list[0] ?? "your child";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export interface ReminderItem { type: ItemType; title: string; date: string }

/** One notification covering every unanswered item a family has coming up. */
export function reminderMessage(children: string[], items: ReminderItem[], fromCoach = false): { title: string; body: string } {
  const who = firstNames(children);
  const what = items.length === 1 ? `${items[0].title} on ${shortDay(items[0].date)}` : `${items.length} things coming up`;
  return {
    title: fromCoach ? "Your coach is asking: who's available?" : "Can they make it?",
    body: `Is ${who} available for ${what}? Tap to answer so the coaches can plan.`,
  };
}

/** A tidy title for a match: "v Anstey Nomads" / "Cup: v Anstey Nomads". */
export function matchTitle(opponent: string, competition: string | null): string {
  const comp = competition && !/^league$/i.test(competition.trim()) ? `${competition.trim()}: ` : "";
  return `${comp}v ${opponent}`;
}
