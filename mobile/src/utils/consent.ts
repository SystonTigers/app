/**
 * Photo and video consent helpers. No react-native imports (tested in Node).
 */
export interface ConsentAnswers {
  photos: boolean | null;
  video: boolean | null;
}

/** Counts for the staff overview. */
export function consentSummary(players: ConsentAnswers[]): { photosYes: number; videoYes: number; notAnswered: number } {
  return {
    photosYes: players.filter((p) => p.photos === true).length,
    videoYes: players.filter((p) => p.video === true).length,
    notAnswered: players.filter((p) => p.photos === null || p.video === null).length,
  };
}

/** Names of the players still waiting for an answer (for the parent's reminder). */
export function awaitingAnswer<T extends ConsentAnswers & { name: string }>(players: T[]): string[] {
  return players.filter((p) => p.photos === null || p.video === null).map((p) => p.name);
}

/** "Sam" / "Sam and Jo" / "Sam, Jo and Alex" */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
