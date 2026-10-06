import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import ScreenIntro from '../components/brand/ScreenIntro';
import SeasonPicker from '../components/seasons/SeasonPicker';
import { useTracksAssists } from '../context/ClubContext';
import { apiErrorMessage, historyApi, resultsApi, statsApi } from '../services/api';
import { seasonSummary } from '../utils/results';
import { leaderboard, readTotals, type Board, type PlayerTotals } from '../utils/stats';
import { awardTitle, cardParts, hasAwards, shownFunStats, type FunStat, type SeasonAward } from '../utils/history';

/**
 * Club history (the website's History page): season by season, or all time,
 * the record, the top three in each category, the season's awards and fun
 * stats. Tap a player for their page.
 */
export default function ClubHistoryScreen({ navigation }: any) {
  const c = useBrandColors();
  const styles = useStyles();
  const withAssists = useTracksAssists();
  const [season, setSeason] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ homeScore: number; awayScore: number; points?: number }>>([]);
  const [players, setPlayers] = useState<PlayerTotals[]>([]);
  const [awards, setAwards] = useState<SeasonAward[]>([]);
  const [fun, setFun] = useState<FunStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (chosen: string) => {
    setError('');
    try {
      const [res, stats, funStats, awardList] = await Promise.all([
        resultsApi.list(chosen),
        statsApi.getPlayerStats(chosen),
        historyApi.funStats(chosen).catch(() => [] as FunStat[]),
        hasAwards(chosen) ? historyApi.awards(chosen).catch(() => [] as SeasonAward[]) : Promise.resolve([] as SeasonAward[]),
      ]);
      setResults(Array.isArray(res?.data) ? res.data : []);
      setPlayers(readTotals(stats?.data));
      setFun(shownFunStats(funStats));
      setAwards(awardList);
    } catch (err) {
      setError(apiErrorMessage(err, "The club's history didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (season) { setLoading(true); load(season); } }, [season, load]);

  const summary = useMemo(() => seasonSummary(results), [results]);
  const boards: Array<{ id: Board; title: string; unit: string }> = [
    { id: 'goals', title: 'TOP SCORERS', unit: 'goals' },
    ...(withAssists ? [{ id: 'assists' as Board, title: 'MOST ASSISTS', unit: 'assists' }] : []),
    { id: 'motm', title: 'MAN OF THE MATCH', unit: 'awards' },
  ];
  const apps = useMemo(() => [...players].filter((p) => p.appearances > 0).sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name)).slice(0, 3), [players]);
  const openPlayer = (id: string) => navigation.navigate('Player', { id });

  const Tile = ({ value, label }: { value: string | number; label: string }) => (
    <View style={styles.tile}><Text style={[styles.tileValue, { color: c.primary }]}>{value}</Text><Text style={styles.tileLabel}>{label}</Text></View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if (season) { setRefreshing(true); load(season); } }} tintColor={c.primary} />}>
      <ScreenIntro title="Club history" subtitle="Past seasons, records and awards." />
      <SeasonPicker value={season} onChange={(id) => setSeason(id)} />
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{season === 'all' ? 'ALL TIME' : 'THE SEASON'}</Text>
            {summary.played ? (
              <>
                <View style={styles.tiles}>
                  <Tile value={summary.played} label="Played" />
                  <Tile value={summary.won} label="Won" />
                  <Tile value={summary.drawn} label="Drawn" />
                  <Tile value={summary.lost} label="Lost" />
                </View>
                <Text style={styles.meta}>Goals {summary.goalsFor}–{summary.goalsAgainst} · {summary.points} points</Text>
              </>
            ) : <Text style={styles.body}>No results recorded for this season yet.</Text>}
          </View>

          {awards.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SEASON AWARDS</Text>
              {awards.map((a) => (
                <View key={a.id} style={styles.row}>
                  <MaterialCommunityIcons name="trophy-award" size={22} color={c.primary} />
                  <View style={styles.flex}>
                    <Text style={styles.strong}>{awardTitle(a)}</Text>
                    <Text style={styles.body}>{a.player_name ?? 'A former player'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {boards.map((b) => {
            const rows = leaderboard(players, b.id, 3);
            if (!rows.length) return null;
            return (
              <View key={b.id} style={styles.card}>
                <Text style={styles.cardTitle}>{b.title}</Text>
                {rows.map((r) => (
                  <Pressable key={r.player.id} onPress={() => openPlayer(r.player.id)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${r.player.name}, ${r.value} ${b.unit}`}>
                    <Text style={styles.rank}>{r.rank}</Text>
                    <Text style={[styles.body, styles.flex]} numberOfLines={1}>{r.player.name}</Text>
                    <Text style={[styles.value, { color: c.primary }]}>{r.value}</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}

          {apps.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>MOST APPEARANCES</Text>
              {apps.map((p, i) => (
                <Pressable key={p.id} onPress={() => openPlayer(p.id)} style={styles.row} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.appearances} appearances`}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Text style={[styles.body, styles.flex]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.value, { color: c.primary }]}>{p.appearances}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {fun.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>FUN STATS</Text>
              <View style={styles.funGrid}>
                {fun.map((f) => (
                  <View key={f.key} style={styles.fun}>
                    <View style={styles.funValueRow}>
                      {cardParts(f.value).map((p, i) => (
                        <View key={i} style={styles.funPart}>
                          <Text style={[styles.funValue, { color: c.primary }]}>{p.count}</Text>
                          {p.card ? <View style={[styles.cardShape, { backgroundColor: p.card === 'yellow' ? '#FACC15' : '#EF4444' }]} accessibilityLabel={`${p.card} cards`} /> : null}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.strong}>{f.label}</Text>
                    {f.description ? <Text style={styles.meta}>{f.description}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  loading: { marginTop: 24 },
  error: { color: c.error },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', backgroundColor: c.surfaceRaised, borderRadius: 12, paddingVertical: 10 },
  tileValue: { fontFamily: FONTS.display, fontSize: 28 },
  tileLabel: { color: c.textLight, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  flex: { flex: 1 },
  rank: { color: c.textLight, fontFamily: FONTS.display, fontSize: 18, width: 22, textAlign: 'center' },
  value: { fontFamily: FONTS.display, fontSize: 22 },
  body: { color: c.text, lineHeight: 21 },
  strong: { color: c.text, fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  funGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fun: { width: '48%', flexGrow: 1, backgroundColor: c.surfaceRaised, borderRadius: 12, padding: 10, gap: 2 },
  funValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funPart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  funValue: { fontFamily: FONTS.display, fontSize: 26 },
  cardShape: { width: 11, height: 15, borderRadius: 2 },
}));
