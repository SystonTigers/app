/** Match phases for the Match Centre phase bar. No react-native imports (tested in Node). */
export type PhaseStep = 'kick_off' | 'half_time' | 'second_half' | 'full_time';

export const PHASE_STEPS: Array<{ id: PhaseStep; short: string; button: string }> = [
  { id: 'kick_off', short: 'Kick off', button: 'KICK OFF' },
  { id: 'half_time', short: 'Half time', button: 'HALF TIME' },
  { id: 'second_half', short: '2nd half KO', button: 'START 2ND HALF' },
  { id: 'full_time', short: 'Full time', button: 'FULL TIME' },
];

/** The next phase to press, from the match status and half; null once it's over. */
export function nextPhase(status: 'scheduled' | 'live' | 'half_time' | 'full_time' | null, period: 1 | 2 | null): PhaseStep | null {
  if (!status || status === 'scheduled') return 'kick_off';
  if (status === 'half_time') return 'second_half';
  if (status === 'full_time') return null;
  return period === 2 ? 'full_time' : 'half_time';
}

/** How many steps are done: 0 before kick-off, 4 at full time. */
export function phasesDone(next: PhaseStep | null): number {
  return next === null ? PHASE_STEPS.length : PHASE_STEPS.findIndex((s) => s.id === next);
}
