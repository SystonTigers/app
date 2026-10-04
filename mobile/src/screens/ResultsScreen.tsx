import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { FAB, IconButton } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { apiErrorMessage, resultsApi, type ClubResult } from '../services/api';
import SeasonPicker from '../components/seasons/SeasonPicker';
import ResultFormModal from '../components/results/ResultFormModal';
import FaSnippetCard from '../components/faFullTime/FaSnippetCard';
import { useFaSnippets } from '../components/faFullTime/useFaSnippets';
import { outcome, resultDate, seasonSummary } from '../utils/results';

/**
 * Results season by season. Everyone can look back; staff add old results,
 * correct scores and remove mistakes (Match Centre adds new ones itself).
 */
export default function ResultsScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);
  const [season, setSeason] = useState<string | null>(null);
  const [results, setResults] = useState<ClubResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const snippets = useFaSnippets();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClubResult | null>(null);
  const [seasonsVersion, setSeasonsVersion] = useState(0);

  const load = useCallback(async (chosen: string) => {
    setError('');
    try {
      const res = await resultsApi.list(chosen);
      setResults(res.data || []);
    } catch (err) {
      setError(apiErrorMessage(err, "Results couldn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (season) {
      setLoading(true);
      load(season);
    }
  }, [season, load]);

  const summary = useMemo(() => seasonSummary(results), [results]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: ClubResult) => { setEditing(r); setFormOpen(true); };

  const remove = (r: ClubResult) => {
    Alert.alert('Remove this result?', `${r.opponent} on ${resultDate(r.date)}. The league table is updated straight away.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await resultsApi.remove(r.id);
            setNotice('Result removed.');
            setSeasonsVersion((v) => v + 1);
            if (season) load(season);
          } catch (err) {
            setError(apiErrorMessage(err, "That result couldn't be removed. Please try again."));
          }
        },
      },
    ]);
  };

  const outcomeColour = (o: 'W' | 'D' | 'L') => (o === 'W' ? COLORS.success : o === 'D' ? COLORS.warning : COLORS.error);

  return (
    <View style={styles.container}>
      <SeasonPicker value={season} refreshKey={seasonsVersion} onChange={(id) => { setNotice(''); setSeason(id); }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if (season) { setRefreshing(true); load(season); } }} tintColor={COLORS.primary} />}
      >
        {results.length ? (
          <View style={styles.summary} accessibilityLabel={`Played ${summary.played}, won ${summary.won}, drawn ${summary.drawn}, lost ${summary.lost}`}>
            {([
              ['P', summary.played], ['W', summary.won], ['D', summary.drawn], ['L', summary.lost],
              ['GF', summary.goalsFor], ['GA', summary.goalsAgainst], ['PTS', summary.points],
            ] as const).map(([label, value]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loading} />
        ) : results.length === 0 && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No results for this season yet</Text>
            <Text style={styles.emptyText}>
              {isStaff
                ? 'Results from Match Centre appear here automatically. Add older results with the button below.'
                : 'Results appear here after each match.'}
            </Text>
          </View>
        ) : (
          results.map((r) => {
            const o = outcome(r.homeScore, r.awayScore);
            return (
              <View key={r.id} style={styles.card}>
                <View style={[styles.badge, { backgroundColor: outcomeColour(o) }]}>
                  <Text style={styles.badgeText}>{o}</Text>
                </View>
                <View style={styles.cardMain}>
                  <Text style={styles.opponent} numberOfLines={1}>{r.homeAway === 'away' ? `at ${r.opponent}` : `v ${r.opponent}`}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {resultDate(r.date)}{r.competition ? ` · ${r.competition}` : ''}
                  </Text>
                  {r.scorers ? <Text style={styles.scorers} numberOfLines={2}>⚽ {r.scorers}</Text> : null}
                </View>
                <Text style={styles.score}>{r.homeScore}–{r.awayScore}</Text>
                {isStaff ? (
                  <View style={styles.actions}>
                    <IconButton icon="pencil" size={18} iconColor={COLORS.textLight} onPress={() => openEdit(r)} accessibilityLabel={`Edit result against ${r.opponent}`} />
                    <IconButton icon="delete-outline" size={18} iconColor={COLORS.error} onPress={() => remove(r)} accessibilityLabel={`Remove result against ${r.opponent}`} />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
        {/* Until the club adds its own results, its FA Full-Time snippets fill in (as on the website) */}
        {!loading && results.length === 0 && !error && snippets.team ? <FaSnippetCard flush code={snippets.team} title="OUR FIXTURES AND RESULTS" /> : null}
        {!loading && snippets.results ? <FaSnippetCard flush code={snippets.results} title="AROUND THE LEAGUE" /> : null}
        {isStaff ? (
          <Text style={styles.hint}>Filling in an old season? Tap Add result and enter the match date; choose that season above to check them.</Text>
        ) : null}
      </ScrollView>

      {isStaff ? <FAB icon="plus" label="Add result" style={styles.fab} color={COLORS.onPrimary} onPress={openAdd} /> : null}
      <ResultFormModal
        visible={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(message) => {
          setFormOpen(false);
          setNotice(message);
          setSeasonsVersion((v) => v + 1);
          if (season) load(season);
        }}
      />
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 96, gap: 10 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: c.text, fontFamily: FONTS.display, fontSize: 24 },
  statLabel: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  empty: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 6 },
  emptyTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
  emptyText: { color: c.textLight, lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingVertical: 10, paddingLeft: 12, paddingRight: 4 },
  badge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#06080B', fontWeight: '900' },
  cardMain: { flex: 1, gap: 2 },
  opponent: { color: c.text, fontWeight: '800', fontSize: 15 },
  meta: { color: c.textLight, fontSize: 12 },
  scorers: { color: c.textLight, fontSize: 12 },
  score: { color: c.text, fontFamily: FONTS.display, fontSize: 26, minWidth: 54, textAlign: 'right', paddingRight: 8 },
  actions: { flexDirection: 'row' },
  hint: { color: c.textLight, fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: c.primary },
}));
