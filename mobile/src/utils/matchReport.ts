/**
 * Match report helpers (staff, after a match that wasn't run in Match
 * Centre, or to correct one). No react-native imports
 * (node test/matchReport.test.js). Same rules as the website's report.
 */

export type ReportEventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm' | 'sub_on' | 'sub_off';

export interface ReportEvent {
  playerId: string;
  eventType: ReportEventType;
  minute?: number;
  relatedPlayerId?: string;
}

export const EVENT_CHOICES: Array<{ id: Exclude<ReportEventType, 'sub_off'>; label: string; icon: string }> = [
  { id: 'goal', label: 'Goal', icon: 'soccer' },
  { id: 'assist', label: 'Assist', icon: 'shoe-cleat' },
  { id: 'yellow_card', label: 'Yellow card', icon: 'card' },
  { id: 'red_card', label: 'Red card', icon: 'card' },
  { id: 'motm', label: 'Man of the Match', icon: 'star' },
  { id: 'sub_on', label: 'Substitution', icon: 'swap-horizontal' },
];

export const EVENT_LABEL: Record<ReportEventType, string> = {
  goal: 'Goal', assist: 'Assist', yellow_card: 'Yellow card', red_card: 'Red card',
  motm: 'Man of the Match', sub_on: 'Came on', sub_off: 'Went off',
};

export const MAX_STARTERS = 11;
export const MAX_SUBS = 7;

export interface LoadedReport {
  events: ReportEvent[];
  starters: string[];
  subs: string[];
  /** Match Centre things the report can't show (sin bins…): saving removes them */
  skipped: number;
  /** The match was recorded in Match Centre */
  fromMatchCentre: boolean;
}

/**
 * The server's rows back into the form. Starters are anyone who played
 * without coming on; subs are the ones who came on.
 */
export function readReport(rows: Array<Record<string, unknown>>): LoadedReport {
  const events: ReportEvent[] = [];
  const cameOn = new Set<string>();
  const played: string[] = [];
  let skipped = 0;
  let fromMatchCentre = false;
  for (const row of rows) {
    const playerId = String(row.player_id ?? row.playerId ?? '');
    const type = String(row.event_type ?? row.eventType ?? '');
    if (String(row.id ?? '').startsWith('live-')) fromMatchCentre = true;
    if (!playerId) continue;
    const m = row.minute == null ? undefined : Number(row.minute);
    if (type === 'appearance') {
      if (!played.includes(playerId)) played.push(playerId);
    } else if (type in EVENT_LABEL) {
      events.push({ playerId, eventType: type as ReportEventType, minute: Number.isFinite(m) ? m : undefined });
      if (type === 'sub_on') cameOn.add(playerId);
      else if (!played.includes(playerId)) played.push(playerId);
    } else {
      skipped += 1;
    }
  }
  const starters = played.filter((id) => !cameOn.has(id)).slice(0, MAX_STARTERS);
  return { events, starters, subs: [...cameOn].slice(0, MAX_SUBS), skipped, fromMatchCentre };
}

/** "" → undefined, "45" → 45, kept between 0 and 150. */
export function readMinute(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const n = parseInt(text, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, 0), 150);
}

/** Adds one thing that happened; a substitution adds who went off and who came on. */
export function addEvent(events: ReportEvent[], type: Exclude<ReportEventType, 'sub_off'>, playerId: string, minute?: number, offId?: string): ReportEvent[] {
  if (type === 'sub_on') {
    if (!offId || offId === playerId) return events;
    return [...events, { playerId: offId, eventType: 'sub_off', minute, relatedPlayerId: playerId }, { playerId, eventType: 'sub_on', minute, relatedPlayerId: offId }];
  }
  return [...events, { playerId, eventType: type, minute }];
}

/** Events in match order (no minute last), keeping where each came from for removing. */
export function timeline(events: ReportEvent[]): Array<{ ev: ReportEvent; index: number }> {
  return events.map((ev, index) => ({ ev, index })).sort((a, b) => (a.ev.minute ?? 999) - (b.ev.minute ?? 999) || a.index - b.index);
}

/** Toggles a player into the starters or subs (never both, within the limits). */
export function toggleLineup(starters: string[], subs: string[], id: string, as: 'starter' | 'sub'): { starters: string[]; subs: string[] } {
  if (as === 'starter') {
    if (starters.includes(id)) return { starters: starters.filter((x) => x !== id), subs };
    if (starters.length >= MAX_STARTERS) return { starters, subs };
    return { starters: [...starters, id], subs: subs.filter((x) => x !== id) };
  }
  if (subs.includes(id)) return { starters, subs: subs.filter((x) => x !== id) };
  if (subs.length >= MAX_SUBS) return { starters, subs };
  return { starters: starters.filter((x) => x !== id), subs: [...subs, id] };
}

/** A gentle check before saving: goals added for us vs the score. */
export function goalsWarning(events: ReportEvent[], ourScore: number): string {
  const goals = events.filter((e) => e.eventType === 'goal').length;
  if (goals > ourScore) return `You've added ${goals} goals but the score says ${ourScore}.`;
  return '';
}
