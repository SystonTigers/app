import type { MatchEvent } from '../../packages/sdk/google-sheets';
import type { Clip, BuildClipOptions, HighlightLabel } from './types';

const LABEL_MAP: Record<string, HighlightLabel> = {
  GOAL: 'GOAL',
  CHANCE: 'CHANCE',
  SKILL: 'SKILL',
  SAVE: 'CHANCE',
  FOUL: 'CHANCE',
  CARD: 'CHANCE',
};

const DEFAULT_OPTIONS: Required<Pick<BuildClipOptions, 'minLenS' | 'padBeforeS' | 'padAfterS'>> = {
  minLenS: 6,
  padBeforeS: 10,
  padAfterS: 12,
};

function toSeconds(minute: number) {
  return Math.max(0, Math.floor(minute * 60));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function buildClips(
  events: MatchEvent[],
  opts: BuildClipOptions = {}
): Clip[] {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }
  const { minLenS, padBeforeS, padAfterS } = { ...DEFAULT_OPTIONS, ...opts };
  const durationLimit = opts.videoDurationS ?? Number.POSITIVE_INFINITY;

  return events
    .filter((event) => LABEL_MAP[event.type])
    .map((event, index) => {
      const minuteSeconds = toSeconds(event.minute);
      const start = clamp(minuteSeconds - padBeforeS, 0, durationLimit);
      const tentativeEnd = minuteSeconds + padAfterS;
      const end = clamp(
        tentativeEnd < start + minLenS ? start + minLenS : tentativeEnd,
        0,
        durationLimit
      );
      const label = LABEL_MAP[event.type];
      const score =
        event.homeScore !== undefined && event.awayScore !== undefined
          ? `${event.homeScore}-${event.awayScore}`
          : undefined;
      const clipId = [
        event.type.toLowerCase(),
        String(event.minute).padStart(3, '0'),
        (event.scorer || 'na').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 8),
        index.toString(36),
      ]
        .filter(Boolean)
        .join('-')
        .replace(/-+/g, '-');

      return {
        id: clipId,
        label,
        startS: start,
        endS: end,
        meta: {
          scorer: event.scorer,
          assister: event.assister,
          score,
          minute: event.minute,
          notes: event.notes,
        },
        sourceEvent: event,
      } satisfies Clip;
    })
    .sort((a, b) => a.startS - b.startS);
}
