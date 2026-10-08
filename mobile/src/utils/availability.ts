/**
 * Availability (backend services/availability/): families say whether each
 * child can make the coming matches, training sessions and club events.
 * Pure helpers shared by the Availability screen, the home prompt and the
 * line-up editor; tested by test/availability.test.js.
 */

export type ItemType = 'match' | 'training' | 'event';
export type Answer = 'yes' | 'no' | 'maybe';

export interface ChildAnswer { playerId: string; name: string; status: Answer | null; note: string | null }
export interface Counts { yes: number; no: number; maybe: number; waiting: number }

export interface AvailabilityItem {
  type: ItemType;
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  time: string | null;
  place: string | null;
  homeAway?: 'home' | 'away';
  /** My linked children, with their answers */
  children: ChildAnswer[];
  /** Staff only: the whole squad */
  counts?: Counts;
}

export interface AvailabilityOverview {
  items: AvailabilityItem[];
  children: Array<{ playerId: string; name: string }>;
  staff: boolean;
}

export interface SquadAnswer extends ChildAnswer {
  number: number | null;
  byStaff: boolean;
  linkedFamilies: number;
}

export const ANSWERS: Array<{ value: Answer; label: string; icon: string }> = [
  { value: 'yes', label: 'Available', icon: 'check-circle' },
  { value: 'maybe', label: 'Maybe', icon: 'help-circle' },
  { value: 'no', label: "Can't go", icon: 'close-circle' },
];

export function answerLabel(status: Answer | null): string {
  return ANSWERS.find((a) => a.value === status)?.label ?? 'Not answered';
}

export const TYPE_ICON: Record<ItemType, string> = { match: 'soccer', training: 'whistle', event: 'calendar-star' };

/** "Sat 11 Oct" */
export function dayLabel(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

/** "Today", "Tomorrow", "Sat 11 Oct" (today is a UK YYYY-MM-DD) */
export function whenLabel(item: Pick<AvailabilityItem, 'date' | 'time'>, today: string): string {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const day = item.date === today ? 'Today' : item.date === tomorrow.toISOString().slice(0, 10) ? 'Tomorrow' : dayLabel(item.date);
  return item.time ? `${day}, ${item.time}` : day;
}

/** Today's date in the UK as YYYY-MM-DD. */
export function ukToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Answers my children still need, soonest first. */
export function unanswered(items: AvailabilityItem[]): Array<{ item: AvailabilityItem; child: ChildAnswer }> {
  return items.flatMap((item) => item.children.filter((c) => !c.status).map((child) => ({ item, child })));
}

/** The home prompt's line: "Can Ava make v Anstey on Sat 11 Oct?" / "3 answers needed for Ava and Ben". */
export function promptLine(items: AvailabilityItem[]): string | null {
  const waiting = unanswered(items);
  if (!waiting.length) return null;
  if (waiting.length === 1) {
    const { item, child } = waiting[0];
    return `Can ${firstName(child.name)} make ${item.type === 'training' ? 'training' : item.title} on ${dayLabel(item.date)}?`;
  }
  return `${waiting.length} answers needed for ${nameList([...new Set(waiting.map((w) => firstName(w.child.name)))])}. It only takes a tap each.`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Staff summary: "9 available · 2 maybe · 1 can't · 4 not answered" (zeros left out). */
export function countsLine(c: Counts | undefined): string {
  if (!c) return '';
  const parts = [
    c.yes ? `${c.yes} available` : '',
    c.maybe ? `${c.maybe} maybe` : '',
    c.no ? `${c.no} can't` : '',
    c.waiting ? `${c.waiting} not answered` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No players in the squad yet';
}

/** Group a squad's answers for the staff view: available, maybe, can't, not answered. */
export function groupSquad(players: SquadAnswer[]): Array<{ status: Answer | null; title: string; players: SquadAnswer[] }> {
  const order: Array<Answer | null> = ['yes', 'maybe', 'no', null];
  const titles: Record<string, string> = { yes: 'Available', maybe: 'Maybe', no: "Can't make it", null: 'Not answered' };
  return order
    .map((status) => ({ status, title: titles[String(status)], players: players.filter((p) => (p.status ?? null) === status) }))
    .filter((g) => g.players.length);
}

/** Line-up editor hint next to a player's name, or '' when there's no answer. */
export function lineupHint(status: Answer | undefined): string {
  return status === 'yes' ? 'available' : status === 'maybe' ? 'maybe' : status === 'no' ? "can't make it" : '';
}
