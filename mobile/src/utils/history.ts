/**
 * Club history helpers (Club history screen). No react-native imports
 * (node test/history.test.js).
 */

export interface SeasonAward { id: string; award_type: string; award_name?: string | null; player_name?: string | null; notes?: string | null }
export interface FunStat { key: string; label: string; value: string | number; description?: string; icon?: string }

const AWARD_NAMES: Record<string, string> = {
  player_of_season: 'Player of the Season',
  top_scorer: 'Top Scorer',
  most_assists: 'Most Assists',
  players_player: "Players' Player",
  most_improved: 'Most Improved',
  managers_player: "Manager's Player",
  golden_glove: 'Golden Glove',
};

export function awardTitle(a: SeasonAward): string {
  return (a.award_name && a.award_name.trim()) || AWARD_NAMES[a.award_type] || 'Award';
}

/** Football years ("2025-26") have no awards; only seasons the club set up do. */
export function hasAwards(seasonId: string | null): boolean {
  return !!seasonId && seasonId !== 'all' && !/^\d{4}-\d{2}$/.test(seasonId);
}

/** "2🟨 1🟥" → parts for drawing card shapes; anything else is plain text. */
export function cardParts(value: string | number): Array<{ count: string; card: 'yellow' | 'red' | null }> {
  const text = String(value);
  if (!/[🟨🟥]/u.test(text)) return [{ count: text, card: null }];
  return text.split(/\s+/).filter(Boolean).map((part) => {
    if (part.includes('🟨')) return { count: part.replace('🟨', ''), card: 'yellow' as const };
    if (part.includes('🟥')) return { count: part.replace('🟥', ''), card: 'red' as const };
    return { count: part, card: null };
  });
}

/** Only fun stats worth showing: drop zero counts that would just look sad. */
export function shownFunStats(stats: FunStat[]): FunStat[] {
  const zeroHides = new Set(['hattrick_count', 'goals_first_15', 'comeback_wins']);
  return stats.filter((s) => !(zeroHides.has(s.key) && Number(s.value) === 0));
}
