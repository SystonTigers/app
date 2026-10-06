import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import ScreenIntro from '../components/brand/ScreenIntro';
import SectionTitle from '../components/home/SectionTitle';
import MatchRow, { opponentSide, type Side } from '../components/fixtures/MatchRow';
import FaSnippetCard from '../components/faFullTime/FaSnippetCard';
import CalendarSubscribe from '../components/fixtures/CalendarSubscribe';
import { useFaSnippets } from '../components/faFullTime/useFaSnippets';
import { useClub } from '../context/ClubContext';
import { isStaffRole } from '../utils/roles';
import { useAuth } from '../context/AuthContext';
import {
  FixturesApiError,
  formatFixtureDate,
  formatKickOffTime,
  getRecentResults,
  getUpcomingFixtures,
  type Fixture,
  type Result,
} from '../services/fixturesApi';

const OUTCOME = { win: 'Won', draw: 'Drew', loss: 'Lost' } as const;

function outcome(r: Result): 'win' | 'draw' | 'loss' {
  if (r.homeScore > r.awayScore) return 'win';
  if (r.homeScore < r.awayScore) return 'loss';
  return 'draw';
}

/** Order two sides by who was at home. Unknown ends show us first. */
function bySide<T>(us: T, them: T, homeAway: 'home' | 'away' | null | undefined): [T, T] {
  return homeAway === 'away' ? [them, us] : [us, them];
}

/**
 * Upcoming fixtures and recent results (bottom tab "Matches"). Clubs that
 * haven't added their own matches yet see their FA Full-Time team snippet
 * instead, and the league's fixtures and results show below ("Around the
 * league"), as on the website.
 */
export default function FixturesScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { club } = useClub();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const snippets = useFaSnippets();

  const load = useCallback(async () => {
    setError('');
    try {
      const [f, r] = await Promise.all([getUpcomingFixtures(), getRecentResults()]);
      setFixtures(f);
      setResults(r);
    } catch (err) {
      setError(err instanceof FixturesApiError || err instanceof Error ? err.message : "We couldn't load the fixtures.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const us = (score?: number | null): Side => ({ name: club?.name || 'Us', color: c.primary, badgeUrl: club?.badgeUrl ?? null, score });

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={c.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
    >
      <ScreenIntro title="Fixtures" subtitle="Upcoming matches and recent results" />
      {club?.slug ? <View style={styles.calendar}><CalendarSubscribe clubSlug={club.slug} /></View> : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
          <Pressable onPress={() => { setLoading(true); load(); }} accessibilityRole="button"><Text style={[styles.link, { color: c.primary }]}>Try again</Text></Pressable>
        </View>
      ) : null}

      {!fixtures.length && !results.length && !error && snippets.team ? (
        <>
          <FaSnippetCard code={snippets.team} title="OUR FIXTURES AND RESULTS" />
          {staff ? (
            <Pressable onPress={() => navigation.navigate('ManageFixtures')} accessibilityRole="button" style={styles.hint}>
              <Text style={styles.hintText}>
                To run matches in Match Centre, add your fixtures in <Text style={{ color: c.primary, fontWeight: '800' }}>Manage Fixtures</Text>: paste the FA email or a photo of the fixture list.
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
      <SectionTitle title="UPCOMING" color={c.primary} />
      {fixtures.length ? fixtures.map((f) => {
        const [home, away] = bySide(us(), opponentSide(f.opponent), f.homeAway);
        const date = formatFixtureDate(f.date);
        const away_ = f.homeAway === 'away';
        return (
          <MatchRow
            key={String(f.id)}
            home={home}
            away={away}
            middle={formatKickOffTime(f.kickOffTime)}
            middleSub="KICK-OFF"
            label={f.status && f.status !== 'scheduled' ? f.status : f.competition || undefined}
            labelTone={f.status === 'postponed' || f.status === 'cancelled' ? 'loss' : 'accent'}
            details={[
              { icon: 'calendar-blank', text: date },
              { icon: 'map-marker', text: f.venue || (away_ ? 'Away' : 'Home') },
            ]}
            accessibilityLabel={`${home.name} v ${away.name}, ${date} ${formatKickOffTime(f.kickOffTime)}`}
            actions={(staff || away_) ? (
              <>
                {away_ ? (
                  <ActionButton icon="car" label="Lift sharing" onPress={() => navigation.navigate('Carpool', { fixtureId: f.id, opponent: f.opponent, fixtureDate: date })} />
                ) : null}
                {staff ? (
                  <ActionButton icon="clipboard-text-outline" label="Scout report" onPress={() => navigation.navigate('ScoutNotes', { fixtureId: f.id, opponent: f.opponent })} />
                ) : null}
              </>
            ) : undefined}
          />
        );
      }) : <Empty text="No fixtures coming up yet." />}

      <SectionTitle title="RESULTS" color={c.primary} />
      {results.length ? results.map((r) => {
        const o = outcome(r);
        const [home, away] = bySide(us(r.homeScore), opponentSide(r.opponent, r.awayScore), r.homeAway);
        const date = formatFixtureDate(r.date);
        return (
          <MatchRow
            key={String(r.id)}
            home={home}
            away={away}
            middle={`${home.score ?? 0} – ${away.score ?? 0}`}
            middleSub="FULL TIME"
            label={`${OUTCOME[o]}${r.competition ? ` · ${r.competition}` : ''}`}
            labelTone={o}
            details={[
              { icon: 'calendar-blank', text: date },
              ...(r.scorers ? [{ icon: 'soccer', text: r.scorers }] : []),
            ]}
            onPress={r.fixtureId ? () => navigation.navigate('MatchHighlights', { fixtureId: r.fixtureId }) : undefined}
            accessibilityLabel={`${OUTCOME[o]} ${home.name} ${home.score} ${away.name} ${away.score}, ${date}${r.fixtureId ? '. Open highlights' : ''}`}
          />
        );
      }) : <Empty text="No results yet. Scores from Match Centre appear here after full time." />}
        </>
      )}

      {snippets.fixtures ? <FaSnippetCard code={snippets.fixtures} title="AROUND THE LEAGUE: FIXTURES" /> : null}
      {snippets.results ? <FaSnippetCard code={snippets.results} title="AROUND THE LEAGUE: RESULTS" /> : null}
    </ScrollView>
  );
}

function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.action, { borderColor: c.primary }, pressed ? { backgroundColor: c.primarySoft } : null]}>
      <MaterialCommunityIcons name={icon as never} size={16} color={c.primary} />
      <Text style={[styles.actionText, { color: c.primary }]}>{label}</Text>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  const styles = useStyles();
  return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  calendar: { paddingHorizontal: 16, marginBottom: 4 },
  errorCard: { marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.error, gap: 6 },
  errorText: { color: c.text },
  link: { fontWeight: '800' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { fontWeight: '800', fontSize: 13 },
  empty: { marginHorizontal: 16, marginBottom: 12, padding: 20, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)' },
  emptyText: { color: c.textLight, textAlign: 'center' },
  hint: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  hintText: { color: c.text, fontSize: 14, lineHeight: 20 },
}));
