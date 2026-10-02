/**
 * Gallery helpers: album kinds and grouping albums by football season
 * (1 August to 31 July). Kept free of React for `node test/gallery.test.js`.
 */

export type AlbumKind = 'match' | 'training' | 'social' | 'throwback';

export const ALBUM_KINDS: Array<{ id: AlbumKind; label: string; icon: string }> = [
  { id: 'social', label: 'Days out', icon: '🎉' },
  { id: 'match', label: 'Match day', icon: '⚽' },
  { id: 'training', label: 'Training', icon: '🏃' },
  { id: 'throwback', label: 'Throwback', icon: '⏰' },
];

export function kindOf(type: string): { id: AlbumKind; label: string; icon: string } {
  return ALBUM_KINDS.find((k) => k.id === type) ?? ALBUM_KINDS[0];
}

/** "2025/26" for any date from 1 Aug 2025 to 31 Jul 2026 */
export function seasonOf(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date || '');
  if (!m) return 'Undated';
  const start = Number(m[2]) >= 8 ? Number(m[1]) : Number(m[1]) - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Albums grouped by season, newest season first, keeping each group's order. */
export function groupBySeason<T extends { date: string }>(albums: T[]): Array<{ season: string; albums: T[] }> {
  const groups = new Map<string, T[]>();
  for (const a of albums) {
    const s = seasonOf(a.date);
    groups.set(s, (groups.get(s) ?? []).concat(a));
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === 'Undated' ? 1 : b === 'Undated' ? -1 : b.localeCompare(a)))
    .map(([season, list]) => ({ season, albums: list }));
}

/** "12 photos", "1 photo" */
export function photoCount(n: number): string {
  return `${n} ${n === 1 ? 'photo' : 'photos'}`;
}

/** "Uploaded 5 photos." / "Uploaded 4 of 5 photos. 1 didn't upload, try it again." */
export function uploadSummary(done: number, total: number): string {
  if (done === total) return `Uploaded ${photoCount(total)}.`;
  const failed = total - done;
  return `Uploaded ${done} of ${photoCount(total)}. ${failed} didn't upload, try ${failed === 1 ? 'it' : 'them'} again.`;
}
