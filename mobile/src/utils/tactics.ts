/**
 * Team tactics (Training → Tactics; the website's Training → Tactics):
 * formation and how we play. No react-native imports (node test/tactics.test.js).
 */

export type Level = 'low' | 'medium' | 'high';

export interface Tactics {
  formation: string;
  playingStyle: string;
  pressingIntensity: Level;
  buildUpPlay: 'short' | 'mixed' | 'direct';
  defensiveLine: 'deep' | 'medium' | 'high';
  width: 'narrow' | 'normal' | 'wide';
  setPlayFocus: string[];
  phases: { attacking: { width: string; tempo: string }; defensive: { width: string; aggression: string } };
}

/** The same lists as the website (11-a-side, then smaller sides). */
export const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-2-1', '3-4-3', '4-1-2-1-2', '2-3-1', '3-2-1', '2-3-2-1', '3-3-2'];
export const STYLES = ['Balanced', 'Possession', 'Counter-Attack', 'High Press', 'Direct Play'];

export const DEFAULT_TACTICS: Tactics = {
  formation: '4-4-2', playingStyle: 'Balanced', pressingIntensity: 'medium', buildUpPlay: 'mixed', defensiveLine: 'medium', width: 'normal',
  setPlayFocus: ['corners', 'free-kicks'],
  phases: { attacking: { width: 'wide', tempo: 'high' }, defensive: { width: 'narrow', aggression: 'medium' } },
};

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

/** The server's saved tactics (or null) filled in with defaults, so the screen never breaks. */
export function readTactics(raw: unknown): Tactics {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const d = DEFAULT_TACTICS;
  return {
    formation: typeof r.formation === 'string' && /^\d(-\d){1,4}$/.test(r.formation) ? r.formation : d.formation,
    playingStyle: typeof r.playingStyle === 'string' && r.playingStyle ? r.playingStyle : d.playingStyle,
    pressingIntensity: pick(r.pressingIntensity, ['low', 'medium', 'high'] as const, d.pressingIntensity),
    buildUpPlay: pick(r.buildUpPlay, ['short', 'mixed', 'direct'] as const, d.buildUpPlay),
    defensiveLine: pick(r.defensiveLine, ['deep', 'medium', 'high'] as const, d.defensiveLine),
    width: pick(r.width, ['narrow', 'normal', 'wide'] as const, d.width),
    setPlayFocus: Array.isArray(r.setPlayFocus) ? r.setPlayFocus.filter((x: unknown) => typeof x === 'string') : d.setPlayFocus,
    phases: {
      attacking: { ...d.phases.attacking, ...(r.phases?.attacking ?? {}) },
      defensive: { ...d.phases.defensive, ...(r.phases?.defensive ?? {}) },
    },
  };
}

/** Players in a formation, keeper included: "4-3-3" → 11, "2-3-1" → 7. */
export function playerCount(formation: string): number {
  return 1 + formation.split('-').reduce((n, x) => n + (Number(x) || 0), 0);
}

/**
 * Where to draw each player on a pitch (0..1 across, 0..1 from our goal up),
 * keeper first, then each line from the back, spread evenly across.
 */
export function positions(formation: string): Array<{ x: number; y: number }> {
  const lines = formation.split('-').map((x) => Number(x) || 0).filter((n) => n > 0);
  const out = [{ x: 0.5, y: 0.06 }];
  lines.forEach((count, i) => {
    const y = 0.2 + (0.72 * (i + 0.5)) / lines.length;
    for (let k = 0; k < count; k++) out.push({ x: (k + 1) / (count + 1), y });
  });
  return out;
}

export const levelLabel = (v: string): string => v.charAt(0).toUpperCase() + v.slice(1);
