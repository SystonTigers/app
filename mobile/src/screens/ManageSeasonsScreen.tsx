import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, seasonsApi, type ClubSeason } from '../services/api';
import { resultDate } from '../utils/results';
import StartSeasonModal from '../components/seasons/StartSeasonModal';
import EndSeasonModal from '../components/seasons/EndSeasonModal';

/**
 * Staff: the club's seasons. Start a new one (carrying the squad over), end
 * the current one with its awards, make another current, or reopen one
 * ended by mistake. Without any, results and stats use football years.
 */
export default function ManageSeasonsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [seasons, setSeasons] = useState<ClubSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState<ClubSeason | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setSeasons(await seasonsApi.list());
    } catch (err) {
      setError(apiErrorMessage(err, "Seasons didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (fn: () => Promise<unknown>, done: string, fallback: string) => {
    setNotice(''); setError('');
    try {
      await fn();
      setNotice(done);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, fallback));
    }
  };

  const reopen = (s: ClubSeason) => Alert.alert(`Reopen ${s.name}?`, 'It becomes active again and its awards are cleared.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reopen', onPress: () => act(() => seasonsApi.reopen(s.id), `${s.name} is open again.`, "That season wasn't reopened. Please try again.") },
  ]);

  const current = seasons.find((s) => s.is_current === 1 && s.status !== 'archived');
  const dates = (s: ClubSeason) => `${resultDate(s.start_date)} to ${s.end_date ? resultDate(s.end_date) : 'now'}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
        <Text style={styles.intro}>Start a new season, end the old one with its awards, and look back at past seasons.</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : seasons.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NO SEASONS SET UP</Text>
            <Text style={styles.body}>Until you start one, results and stats are grouped by football year (August to July).</Text>
            <Button mode="contained" icon="plus" onPress={() => setStarting(true)}>Start your first season</Button>
          </View>
        ) : (
          <>
            {current ? (
              <View style={[styles.card, { borderColor: c.primary }]}>
                <Text style={[styles.eyebrow, { color: c.primary }]}>CURRENT SEASON</Text>
                <Text style={styles.big}>{current.name}</Text>
                <Text style={styles.meta}>Started {resultDate(current.start_date)}</Text>
                <Button mode="outlined" textColor={c.error} style={{ borderColor: c.error }} onPress={() => setEnding(current)}>End season</Button>
              </View>
            ) : null}
            <Button mode="contained" icon="plus" onPress={() => setStarting(true)}>New season</Button>
            <Text style={styles.section}>ALL SEASONS</Text>
            {seasons.map((s) => {
              const isCurrent = s.is_current === 1 && s.status !== 'archived';
              const archived = s.status === 'archived';
              return (
                <View key={s.id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{s.name}{isCurrent ? '  · Current' : archived ? '  · Ended' : ''}</Text>
                    <Text style={styles.meta}>{dates(s)}</Text>
                  </View>
                  {!isCurrent && !archived ? (
                    <Button compact mode="text" onPress={() => act(() => seasonsApi.setCurrent(s.id), `${s.name} is now the current season.`, "That season wasn't made current. Please try again.")}>Make current</Button>
                  ) : null}
                  {archived ? <Button compact mode="text" onPress={() => reopen(s)}>Reopen</Button> : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
      <StartSeasonModal visible={starting} onClose={() => setStarting(false)} onStarted={(name) => { setStarting(false); setNotice(`${name} has started.`); load(); }} />
      <EndSeasonModal season={ending} onClose={() => setEnding(null)} onEnded={(name) => { setEnding(null); setNotice(`${name} has ended and is saved in the club's history.`); load(); }} />
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  intro: { color: c.textLight, lineHeight: 20 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 16, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  eyebrow: { fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 2 },
  big: { color: c.text, fontFamily: FONTS.display, fontSize: 34 },
  body: { color: c.text, lineHeight: 21 },
  meta: { color: c.textLight, fontSize: 12 },
  section: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: 1.5, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 10, paddingLeft: 14, paddingRight: 4 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { color: c.text, fontWeight: '800', fontSize: 15 },
}));
