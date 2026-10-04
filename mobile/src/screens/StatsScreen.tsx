import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { withOpacity } from '../theme/utils';
import { FONTS } from '../theme/brandFonts';
import ScreenIntro from '../components/brand/ScreenIntro';
import SeasonPicker from '../components/seasons/SeasonPicker';
import { useTracksAssists } from '../context/ClubContext';
import { apiErrorMessage, statsApi } from '../services/api';
import { playerInitials } from '../utils/playerNames';
import { boardsFor, disciplineText, leaderboard, readTotals, squadTotals, type Board, type PlayerTotals } from '../utils/stats';

/**
 * Stats: the season's leaderboards (goals, assists, goals + assists, minutes,
 * Man of the Match, cards) from Match Centre, match reports, results with
 * picked scorers and numbers staff added for past seasons. Tap a player for
 * their page.
 */
export default function StatsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const [season, setSeason] = useState<string | null>(null);
  const [board, setBoard] = useState<Board>('goals');
  const withAssists = useTracksAssists();
  const boards = boardsFor(withAssists);
  // A board that's gone (assists switched off) falls back to Goals
  const shown: Board = boards.some((b) => b.id === board) ? board : 'goals';
  const [players, setPlayers] = useState<PlayerTotals[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (chosen: string) => {
    setError('');
    try {
      const res = await statsApi.getPlayerStats(chosen);
      setPlayers(readTotals(res?.data));
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load the stats. Check your signal and try again."));
    }
  }, []);

  useEffect(() => {
    if (!season) return;
    setPlayers(null);
    void load(season);
  }, [season, load]);

  const rows = useMemo(() => (players ? leaderboard(players, shown) : []), [players, shown]);
  const totals = useMemo(() => (players ? squadTotals(players) : null), [players]);
  const current = boards.find((b) => b.id === shown) ?? boards[0];

  const refresh = async () => {
    if (!season) return;
    setRefreshing(true);
    await load(season);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
    >
      <ScreenIntro title="Stats" subtitle="Tap a player for their page" />
      <SeasonPicker value={season} onChange={(id) => setSeason(id)} />

      {totals ? (
        <View style={styles.summary}>
          <Total value={totals.goals} label="GOALS" />
          {withAssists ? <Total value={totals.assists} label="ASSISTS" /> : null}
          <Total value={totals.scorers} label="SCORERS" />
          <Total value={totals.motm} label="MOTM" />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boards} contentContainerStyle={styles.boardsRow}>
        {boards.map((b) => {
          const on = b.id === shown;
          return (
            <Chip
              key={b.id}
              selected={on}
              showSelectedCheck={false}
              onPress={() => setBoard(b.id)}
              icon={({ size }) => <MaterialCommunityIcons name={b.icon as never} size={size} color={on ? c.onPrimary : c.primary} />}
              style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]}
              textStyle={[styles.chipText, on ? { color: c.onPrimary } : null]}
              accessibilityLabel={`${b.label} leaderboard`}
            >
              {b.label}
            </Chip>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={c.textLight} />
          <Text style={styles.stateText} accessibilityRole="alert">{error}</Text>
          <Button mode="contained" onPress={() => season && load(season)}>Try again</Button>
        </View>
      ) : !players ? (
        <View style={styles.state}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : !rows.length ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name={current.icon as never} size={40} color={c.textLight} />
          <Text style={styles.stateText}>{current.empty}</Text>
          <Text style={styles.stateHint}>Match Centre, match reports and results with scorers picked all count here.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={[styles.headText, styles.rankCol]}>#</Text>
            <Text style={[styles.headText, styles.flex]}>PLAYER</Text>
            <Text style={[styles.headText, styles.appsCol]}>APPS</Text>
            <Text style={[styles.headText, styles.valueCol]}>{current.column.toUpperCase()}</Text>
          </View>
          {rows.map(({ player, value, rank }) => (
            <Pressable
              key={player.id}
              onPress={() => navigation.navigate('Player', { id: player.id })}
              accessibilityRole="button"
              accessibilityLabel={`${rank}. ${player.name}, ${value} ${current.column}, ${player.appearances} appearances. Open their page.`}
              style={({ pressed }) => [styles.row, rank === 1 ? { backgroundColor: withOpacity(c.primary, 0.1) } : null, pressed ? styles.pressed : null]}
            >
              <Text style={[styles.rank, styles.rankCol, rank === 1 ? { color: c.primary } : null]}>{rank}</Text>
              {player.photo ? (
                <Image source={{ uri: player.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: withOpacity(c.primary, 0.18) }]}>
                  <Text style={[styles.initials, { color: c.primary }]}>{playerInitials(player)}</Text>
                </View>
              )}
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {shown === 'discipline' ? disciplineText(player) : shown === 'minutes' ? `${Math.round(player.minutes / Math.max(1, player.appearances))} a game` : [player.number ? `#${player.number}` : '', player.position ?? ''].filter(Boolean).join(' · ') || ' '}
                </Text>
              </View>
              <Text style={[styles.apps, styles.appsCol]}>{player.appearances}</Text>
              <Text style={[styles.value, styles.valueCol]}>{shown === 'minutes' ? value.toLocaleString('en-GB') : value}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Total({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.total} accessible accessibilityLabel={`${value} ${label.toLowerCase()}`}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  summary: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 8 },
  total: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  totalValue: { color: c.text, fontFamily: FONTS.display, fontSize: 28, lineHeight: 30 },
  totalLabel: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  boards: { flexGrow: 0, flexShrink: 0, marginTop: 14 },
  boardsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipText: { color: c.text, fontWeight: '700' },
  state: { alignItems: 'center', gap: 12, padding: 32 },
  stateText: { color: c.text, fontSize: 15, textAlign: 'center' },
  stateHint: { color: c.textLight, fontSize: 13, textAlign: 'center' },
  table: { marginHorizontal: 16, marginTop: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  headText: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: c.border },
  pressed: { opacity: 0.7 },
  rankCol: { width: 26, textAlign: 'center' },
  rank: { color: c.textLight, fontFamily: FONTS.display, fontSize: 20 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '900', fontSize: 14 },
  flex: { flex: 1 },
  name: { color: c.text, fontSize: 15, fontWeight: '700' },
  sub: { color: c.textLight, fontSize: 12, marginTop: 2 },
  appsCol: { width: 42, textAlign: 'center' },
  apps: { color: c.textLight, fontSize: 14, fontVariant: ['tabular-nums'] },
  valueCol: { width: 56, textAlign: 'right' },
  value: { color: c.text, fontFamily: FONTS.display, fontSize: 26 },
}));
