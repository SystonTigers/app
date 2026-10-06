import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import PlayerPicker, { type PickablePlayer } from '../components/live/PlayerPicker';
import { useTracksAssists } from '../context/ClubContext';
import { apiErrorMessage, matchReportApi, squadApi } from '../services/api';
import { resultDate } from '../utils/results';
import {
  EVENT_CHOICES, EVENT_LABEL, MAX_STARTERS, MAX_SUBS, addEvent, goalsWarning, readMinute, readReport, timeline, toggleLineup,
  type ReportEvent, type ReportEventType,
} from '../utils/matchReport';

type Choice = Exclude<ReportEventType, 'sub_off'>;

/**
 * Staff: write up a match that wasn't run in Match Centre (or correct one):
 * the score, the line-up and what each player did. Saving saves the result,
 * the players' stats and the league table, the same as the website's report.
 */
export default function MatchReportScreen({ route, navigation }: any) {
  const fixtureId: string = route.params?.fixtureId ?? '';
  const opponent: string = route.params?.opponent ?? '';
  const date: string = route.params?.date ?? '';
  const c = useBrandColors();
  const styles = useStyles();
  const withAssists = useTracksAssists();
  const [players, setPlayers] = useState<PickablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [us, setUs] = useState(route.params?.ourScore != null ? String(route.params.ourScore) : '0');
  const [them, setThem] = useState(route.params?.theirScore != null ? String(route.params.theirScore) : '0');
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fromMatchCentre, setFromMatchCentre] = useState(false);
  const [type, setType] = useState<Choice>('goal');
  const [minute, setMinute] = useState('');
  const [picking, setPicking] = useState<null | 'player' | 'off'>(null);
  const [comingOn, setComingOn] = useState<PickablePlayer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [squad, rows] = await Promise.all([squadApi.getSquad(), matchReportApi.get(fixtureId)]);
      setPlayers((squad?.data ?? []).map((p: { id: string; name: string; number?: number | null }) => ({ id: String(p.id), name: p.name, number: p.number ?? null })));
      const loaded = readReport(rows);
      setEvents(loaded.events); setStarters(loaded.starters); setSubs(loaded.subs);
      setSkipped(loaded.skipped); setFromMatchCentre(loaded.fromMatchCentre);
    } catch (err) {
      setError(apiErrorMessage(err, "This match didn't load. Check your signal and try again."));
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);
  useEffect(() => { load(); }, [load]);

  const names = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  const nameOf = (id?: string) => (id && names.get(id)) || 'Player not in the squad';
  const choices = EVENT_CHOICES.filter((e) => withAssists || e.id !== 'assist');
  const score = (v: string) => Math.min(Math.max(parseInt(v, 10) || 0, 0), 99);

  const picked = (p: PickablePlayer) => {
    const at = readMinute(minute);
    if (type === 'sub_on') {
      if (picking === 'player') { setComingOn(p); setPicking('off'); return; }
      if (comingOn) setEvents((e) => addEvent(e, 'sub_on', comingOn.id, at, p.id));
      setComingOn(null);
    } else {
      setEvents((e) => addEvent(e, type, p.id, at));
    }
    setPicking(null);
    setMinute('');
  };

  const doSave = async () => {
    setSaving(true); setError('');
    try {
      await matchReportApi.save(fixtureId, { homeScore: score(us), awayScore: score(them), events, lineup: { starters, subs } });
      navigation.goBack();
    } catch (err) {
      setError(apiErrorMessage(err, "The match report didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };
  const save = () => {
    const warn = [goalsWarning(events, score(us)), fromMatchCentre || skipped ? 'This match was recorded in Match Centre. Saving the report replaces what was recorded there.' : ''].filter(Boolean).join('\n\n');
    if (!warn) { doSave(); return; }
    Alert.alert('Save the report?', warn, [{ text: 'Go back', style: 'cancel' }, { text: 'Save', onPress: doSave }]);
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color={c.primary} style={styles.loading} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.big}>{opponent ? `VS ${opponent.toUpperCase()}` : 'MATCH REPORT'}</Text>
        <Text style={styles.meta}>{date ? `${resultDate(date)}. ` : ''}Saving the report saves the result, the players&apos; stats and the league table.</Text>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {fromMatchCentre || skipped ? (
          <View style={[styles.note, { borderColor: c.warning }]}>
            <Text style={styles.body}>This match was recorded in Match Centre.{skipped ? ` ${skipped === 1 ? 'One thing' : `${skipped} things`} from there (such as a sin bin) can't be shown here and would be removed.` : ''} To keep everything, make changes in Match Centre instead.</Text>
          </View>
        ) : null}

        {players.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ADD YOUR SQUAD FIRST</Text>
            <Text style={styles.body}>A match report records what your players did, so the squad needs players in it.</Text>
            <Button mode="contained" onPress={() => navigation.navigate('ManageSquad')}>Manage squad</Button>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>FULL-TIME SCORE</Text>
              <View style={styles.scoreRow}>
                <TextInput mode="outlined" label="Us" keyboardType="number-pad" value={us} onChangeText={setUs} style={styles.score} maxLength={2} />
                <Text style={styles.dash}>–</Text>
                <TextInput mode="outlined" label="Them" keyboardType="number-pad" value={them} onChangeText={setThem} style={styles.score} maxLength={2} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>ADD WHAT HAPPENED</Text>
              <View style={styles.chips}>
                {choices.map((ch) => {
                  const on = type === ch.id;
                  return (
                    <Pressable key={ch.id} onPress={() => setType(ch.id)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                      <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{ch.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.row}>
                <TextInput mode="outlined" label="Minute (optional)" keyboardType="number-pad" value={minute} onChangeText={setMinute} style={styles.flex} maxLength={3} />
                <Button mode="contained" icon="plus" onPress={() => setPicking('player')}>{type === 'sub_on' ? 'Who came on?' : 'Pick player'}</Button>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={[styles.cardTitle, styles.flex]}>IN THE REPORT</Text>
                <Text style={styles.meta}>{events.length}</Text>
              </View>
              {events.length === 0 ? <Text style={styles.meta}>Nothing added yet. Add goals, {withAssists ? 'assists, ' : ''}cards, subs and Man of the Match above.</Text> : timeline(events).map(({ ev, index }) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.minute}>{ev.minute != null ? `${ev.minute}'` : '–'}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.strong}>{nameOf(ev.playerId)} <Text style={styles.meta}>· {EVENT_LABEL[ev.eventType]}</Text></Text>
                    {ev.relatedPlayerId ? <Text style={styles.meta}>{ev.eventType === 'sub_on' ? 'for' : 'replaced by'} {nameOf(ev.relatedPlayerId)}</Text> : null}
                  </View>
                  <IconButton icon="close" size={18} onPress={() => setEvents((e) => e.filter((_, i) => i !== index))} accessibilityLabel={`Remove ${EVENT_LABEL[ev.eventType].toLowerCase()} for ${nameOf(ev.playerId)}`} />
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={[styles.cardTitle, styles.flex]}>LINE-UP</Text>
                <Text style={styles.meta}>Starting {starters.length}/{MAX_STARTERS} · Subs {subs.length}/{MAX_SUBS}</Text>
              </View>
              <Text style={styles.meta}>Starters and subs who came on get a game in their stats. Leave it empty if you don&apos;t want to record it.</Text>
              {players.map((p) => {
                const starting = starters.includes(p.id);
                const sub = subs.includes(p.id);
                const set = (as: 'starter' | 'sub') => { const next = toggleLineup(starters, subs, p.id, as); setStarters(next.starters); setSubs(next.subs); };
                return (
                  <View key={p.id} style={[styles.lineRow, starting ? { borderColor: c.primary } : null]}>
                    <Text style={[styles.body, styles.flex]} numberOfLines={1}>{p.number != null ? `${p.number}. ` : ''}{p.name}</Text>
                    <Pressable onPress={() => set('starter')} style={[styles.small, starting ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="checkbox" accessibilityState={{ checked: starting }} accessibilityLabel={`${p.name} started`}>
                      <Text style={[styles.chipText, starting ? { color: c.onPrimary } : null]}>Start</Text>
                    </Pressable>
                    <Pressable onPress={() => set('sub')} style={[styles.small, sub ? { borderColor: c.primary } : null]} accessibilityRole="checkbox" accessibilityState={{ checked: sub }} accessibilityLabel={`${p.name} was a sub`}>
                      <Text style={[styles.chipText, sub ? { color: c.primary } : null]}>Sub</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      {players.length ? (
        <View style={styles.footer}>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving} icon="content-save">Save match report</Button>
        </View>
      ) : null}
      <PlayerPicker
        visible={!!picking}
        title={picking === 'off' ? `Who went off for ${comingOn?.name ?? 'them'}?` : type === 'sub_on' ? 'Who came on?' : `${EVENT_LABEL[type]}: who?`}
        players={players}
        excludeId={picking === 'off' ? comingOn?.id ?? null : null}
        onPick={picked}
        onCancel={() => { setPicking(null); setComingOn(null); }}
      />
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  loading: { marginTop: 24 },
  big: { color: c.text, fontFamily: FONTS.display, fontSize: 30, lineHeight: 32 },
  meta: { color: c.textLight, fontSize: 12 },
  error: { color: c.error },
  note: { borderWidth: 1, borderRadius: 14, padding: 12, backgroundColor: c.surfaceRaised },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  strong: { color: c.text, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  score: { width: 96, textAlign: 'center', fontSize: 28 },
  dash: { color: c.textLight, fontFamily: FONTS.display, fontSize: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  minute: { color: c.textLight, fontFamily: FONTS.display, fontSize: 18, width: 36, textAlign: 'right' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 6, paddingLeft: 12, paddingRight: 6 },
  small: { borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  footer: { borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, padding: 12 },
}));
