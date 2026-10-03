/**
 * Drills in one list: the built-in library (with set-up, steps and coaching
 * points from data/drillDetails) and the club's own drills from the server.
 * No react-native imports (node test/drills.test.js).
 */
import { DRILLS_LIBRARY, type Drill } from '../data/drillsData';
import { DRILL_DETAILS } from '../data/drillDetails';

export type Difficulty = Drill['difficulty'];
export type VideoPlatform = 'tiktok' | 'instagram' | 'youtube';

/** A drill as the library and drill page show it. `ref` is "lib:<id>" or "club:<id>". */
export interface AppDrill extends Drill {
  ref: string;
  club: boolean;
  setup: string | null;
  steps: string[];
  coachingPoints: string[];
  progressions: string[];
}

/** A club drill as the server sends it (GET /api/v1/training/drills). */
export interface ClubDrill {
  id: string;
  ref: string;
  name: string;
  category: string;
  duration: string;
  durationMinutes: number;
  players: string;
  difficulty: string;
  equipment: string[];
  focus: string[];
  description: string;
  setup: string | null;
  steps: string[];
  coachingPoints: string[];
  diagramUrl: string | null;
}

export interface DrillLink {
  id: string;
  ref: string;
  url: string;
  platform: VideoPlatform;
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
}

/** Categories a club drill can have (matches the server's list). */
export const CLUB_CATEGORIES = ['Warm-up', 'Passing', 'Shooting', 'Dribbling', 'Defending', 'Tactical', 'Fitness', 'Cool-down', 'Goalkeeping', 'Technical'];
export const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export type DrillView = 'all' | 'favourites' | 'club';

export function libraryDrill(d: Drill): AppDrill {
  const detail = DRILL_DETAILS[d.id];
  return {
    ...d,
    ref: `lib:${d.id}`,
    club: false,
    setup: detail?.setup ?? null,
    steps: detail?.steps ?? [],
    coachingPoints: detail?.coachingPoints ?? [],
    progressions: detail?.progressions ?? [],
  };
}

export function clubDrill(d: ClubDrill): AppDrill {
  return {
    id: d.id,
    ref: d.ref,
    club: true,
    name: d.name,
    category: d.category,
    duration: d.duration,
    players: d.players || 'Any',
    equipment: d.equipment,
    description: d.description,
    difficulty: (DIFFICULTIES as string[]).includes(d.difficulty) ? (d.difficulty as Difficulty) : 'intermediate',
    focus: d.focus,
    diagramUrl: d.diagramUrl ?? undefined,
    setup: d.setup,
    steps: d.steps,
    coachingPoints: d.coachingPoints,
    progressions: [],
  };
}

const LIBRARY: AppDrill[] = DRILLS_LIBRARY.map(libraryDrill);

/** The club's drills first (A–Z from the server), then the built-in library. */
export function allDrills(club: ClubDrill[], library: AppDrill[] = LIBRARY): AppDrill[] {
  return [...club.map(clubDrill), ...library];
}

export function findDrill(ref: string, drills: AppDrill[]): AppDrill | null {
  return drills.find((d) => d.ref === ref) ?? null;
}

/** Older links into the library used the bare id ("drill-012"). */
export function refFrom(value: string | undefined | null): string | null {
  if (!value) return null;
  return value.startsWith('lib:') || value.startsWith('club:') ? value : `lib:${value}`;
}

export function filterDrills(drills: AppDrill[], f: { query?: string; category?: string; difficulty?: string; view?: DrillView; favourites?: string[] }): AppDrill[] {
  const q = (f.query ?? '').trim().toLowerCase();
  let list = drills;
  if (f.view === 'favourites') list = (f.favourites ?? []).map((r) => drills.find((d) => d.ref === r)).filter((d): d is AppDrill => !!d);
  if (f.view === 'club') list = list.filter((d) => d.club);
  if (f.category && f.category !== 'All') list = list.filter((d) => d.category === f.category);
  if (f.difficulty && f.difficulty !== 'All') list = list.filter((d) => d.difficulty === f.difficulty);
  if (q) {
    list = list.filter((d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.focus.some((x) => x.toLowerCase().includes(q)));
  }
  return list;
}

export const PLATFORM_LABELS: Record<VideoPlatform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' };
export const PLATFORM_ICONS: Record<VideoPlatform, string> = { tiktok: 'music-note', instagram: 'instagram', youtube: 'youtube' };

/** Quick check before sending a link (the server checks properly). */
export function looksLikeVideoLink(text: string): boolean {
  return /^https?:\/\/([\w-]+\.)*(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)\//i.test(text.trim());
}

/** What Share sends for a drill. */
export function shareText(d: AppDrill): string {
  const lines = [`${d.name} (${d.category}, ${d.duration}, ${d.players} players)`, '', d.description];
  if (d.setup) lines.push('', `Set-up: ${d.setup}`);
  if (d.steps.length) lines.push('', 'How it works:', ...d.steps.map((s, i) => `${i + 1}. ${s}`));
  if (d.coachingPoints.length) lines.push('', 'Coaching points:', ...d.coachingPoints.map((s) => `• ${s}`));
  return lines.join('\n').trim();
}

/** The create/edit form: lists are one item per line, equipment and focus comma separated. */
export interface DrillForm {
  name: string;
  category: string;
  duration: string;
  players: string;
  difficulty: Difficulty;
  equipment: string;
  focus: string;
  description: string;
  setup: string;
  steps: string;
  coachingPoints: string;
}

export function emptyForm(): DrillForm {
  return { name: '', category: 'Passing', duration: '15', players: '', difficulty: 'intermediate', equipment: '', focus: '', description: '', setup: '', steps: '', coachingPoints: '' };
}

/** Start a form from a drill: edit a club drill, or copy a built-in one to make it your own. */
export function formFromDrill(d: AppDrill, copy = false): DrillForm {
  return {
    name: copy ? `${d.name} (our version)` : d.name,
    category: CLUB_CATEGORIES.includes(d.category) ? d.category : 'Technical',
    duration: String(Number(/\d+/.exec(d.duration)?.[0]) || 15),
    players: d.players === 'Any' ? '' : d.players,
    difficulty: d.difficulty,
    equipment: d.equipment.join(', '),
    focus: d.focus.join(', '),
    description: d.description,
    setup: d.setup ?? '',
    steps: d.steps.join('\n'),
    coachingPoints: d.coachingPoints.join('\n'),
  };
}

/** Why the form can't be saved yet, or null. */
export function formProblem(f: DrillForm): string | null {
  if (!f.name.trim()) return 'Give the drill a name.';
  const mins = Number(f.duration);
  if (!Number.isInteger(mins) || mins < 1 || mins > 180) return 'How many minutes does it take? (1 to 180)';
  if (!f.description.trim() && !f.steps.trim()) return 'Add a short description or the steps, so other coaches know how it runs.';
  return null;
}

/** What the server expects (POST/PUT /api/v1/training/drills). */
export function formBody(f: DrillForm) {
  return {
    name: f.name.trim(),
    category: f.category,
    duration: Number(f.duration),
    players: f.players.trim(),
    difficulty: f.difficulty,
    equipment: f.equipment,
    focus: f.focus,
    description: f.description.trim(),
    setup: f.setup.trim(),
    steps: f.steps,
    coachingPoints: f.coachingPoints,
  };
}
