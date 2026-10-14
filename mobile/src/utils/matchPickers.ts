/**
 * Who Match Centre's player pickers offer. With a line-up the app tracks who is
 * on the pitch right now (starters, then each sub and red card), so:
 * - who scored, who made the assist, who is going off: the players on the pitch
 * - who is coming on: the players on the bench
 * - cards and sin bins: the whole squad (players can be booked on the bench)
 * One tap shows the full squad instead, for when tracking has drifted (a missed
 * sub) or the manager doesn't record subs. Without a line-up there's nothing to
 * track, so every picker shows the squad. No react-native imports, so it can be
 * tested in Node.
 */
import { activeSinBins, pitchAndBench, sentOffIds, type LiveMatchView } from './liveMatch';

export type PickerKind = 'goal' | 'assist' | 'yellow' | 'red' | 'sin_bin' | 'sub_off' | 'sub_on';

/** Which group a picker starts with (null: always the whole squad). */
export type PickerGroup = 'pitch' | 'bench';

export interface PickerList<P> {
  /** The players to show, in order */
  players: Array<P & { where: string | null }>;
  /** The group shown by default, or null when there's nothing to track (no line-up, or a card) */
  group: PickerGroup | null;
  /** How many more the full squad adds (0: the toggle has nothing to show) */
  hiddenCount: number;
  /** Whether this player is in the default group (always true without one) */
  inGroup: (id: string) => boolean;
}

const GROUP_OF: Record<PickerKind, PickerGroup | null> = {
  goal: 'pitch', assist: 'pitch', sub_off: 'pitch', sub_on: 'bench', yellow: null, red: null, sin_bin: null,
};

const WHERE: Record<PickerGroup, string> = { pitch: 'On the pitch', bench: 'On the bench' };

/**
 * The players a picker offers.
 * @param squad the club's squad, in the order to show
 * @param lineup the match's line-up (null when none was picked, or not loaded yet)
 * @param fullSquad the manager tapped "Show full squad"
 * @param excludeId already picked in this flow (the scorer, or who went off)
 */
export function pickerPlayers<P extends { id: string }>(
  kind: PickerKind,
  squad: P[],
  match: Pick<LiveMatchView, 'events' | 'halfLength' | 'endedAt'>,
  lineup: { starters: string[]; subs: string[] } | null,
  now: number,
  fullSquad: boolean,
  excludeId: string | null = null,
): PickerList<P> {
  // Sent-off players take no further part; someone already in the sin bin can't go in twice
  const off = sentOffIds(match.events);
  const binned = new Set(activeSinBins(match, now).map((b) => b.playerId).filter((id): id is string => !!id));
  const base = squad.filter((p) => p.id !== excludeId && !off.has(p.id) && !(kind === 'sin_bin' && binned.has(p.id)));

  const sides = pitchAndBench(lineup, match.events);
  const group = sides ? GROUP_OF[kind] : null;
  if (!sides || !group) {
    return { players: base.map((p) => ({ ...p, where: null })), group: null, hiddenCount: 0, inGroup: () => true };
  }
  // A player serving a sin bin isn't on the pitch, so can't score or assist
  const onPitchNow = new Set([...sides.onPitch].filter((id) => !((kind === 'goal' || kind === 'assist') && binned.has(id))));
  const ids = group === 'pitch' ? onPitchNow : sides.bench;
  const inGroup = (id: string) => ids.has(id);
  const shown = base.filter((p) => inGroup(p.id));
  const hiddenCount = base.length - shown.length;
  if (!fullSquad) return { players: shown.map((p) => ({ ...p, where: null })), group, hiddenCount, inGroup };

  // Full squad: the usual group first, then everyone else labelled with where the app thinks they are
  const whereOf = (id: string): string => (sides.onPitch.has(id) ? WHERE.pitch : sides.bench.has(id) ? WHERE.bench : 'Not in the team');
  const rest = base.filter((p) => !inGroup(p.id));
  return { players: [...shown.map((p) => ({ ...p, where: null })), ...rest.map((p) => ({ ...p, where: whereOf(p.id) }))], group, hiddenCount, inGroup };
}

/** The line under a picker's title: who's listed and how many. */
export function pickerHeading(list: Pick<PickerList<unknown>, 'group' | 'players'>, fullSquad: boolean): string | null {
  if (!list.group) return null;
  if (fullSquad) return `Full squad · ${list.players.length}`;
  return `${WHERE[list.group]} · ${list.players.length}`;
}

/** The toggle's words ("Show full squad" or back to the group). */
export function pickerToggleLabel(group: PickerGroup, fullSquad: boolean): string {
  if (!fullSquad) return 'Show full squad';
  return group === 'pitch' ? 'Show only the pitch' : 'Show only the bench';
}
