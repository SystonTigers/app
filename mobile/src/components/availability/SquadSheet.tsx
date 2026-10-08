import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, availabilityApi } from '../../services/api';
import AnswerButtons from './AnswerButtons';
import { countsLine, groupSquad, whenLabel, type Answer, type AvailabilityItem, type Counts, type SquadAnswer } from '../../utils/availability';

/**
 * Staff: who can make one match, session or event, grouped Available /
 * Maybe / Can't make it / Not answered, with families' notes. A coach can
 * answer for a child (a text from a parent, say) and push a reminder to
 * families who haven't answered.
 */
export default function SquadSheet({ item, today, onClose, onChanged }: {
  item: AvailabilityItem | null;
  today: string;
  onClose: () => void;
  /** Totals after a change, so the list behind stays right */
  onChanged: (counts: Counts) => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [players, setPlayers] = useState<SquadAnswer[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    if (!item) return;
    let stopped = false;
    setPlayers(null); setError(''); setNotice(''); setEditing(null);
    availabilityApi.item(item.type, item.id)
      .then((res) => { if (!stopped) setPlayers(res.players); })
      .catch((err) => { if (!stopped) setError(apiErrorMessage(err, "The squad didn't load. Check your signal and try again.")); });
    return () => { stopped = true; };
  }, [item?.type, item?.id]);

  const totals = (list: SquadAnswer[]): Counts => ({
    yes: list.filter((p) => p.status === 'yes').length,
    no: list.filter((p) => p.status === 'no').length,
    maybe: list.filter((p) => p.status === 'maybe').length,
    waiting: list.filter((p) => !p.status).length,
  });

  const answer = async (p: SquadAnswer, status: Answer | null) => {
    if (!item || !players) return;
    setSaving(p.playerId); setError('');
    try {
      const saved = await availabilityApi.answer(item.type, item.id, p.playerId, status, status ? p.note : null);
      const next = players.map((x) => (x.playerId === p.playerId ? { ...x, status: saved.status, note: saved.note, byStaff: true } : x));
      setPlayers(next);
      onChanged(totals(next));
      setEditing(null);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Check your signal and try again."));
    } finally {
      setSaving(null);
    }
  };

  const remind = async () => {
    if (!item) return;
    setReminding(true); setError(''); setNotice('');
    try {
      const { families } = await availabilityApi.remind(item.type, item.id);
      setNotice(families ? `Reminder sent to ${families} ${families === 1 ? 'family' : 'families'}.` : "Nobody to remind: the players still to answer have no family on the app with notifications on. You can answer for them here.");
    } catch (err) {
      setError(apiErrorMessage(err, "The reminder didn't send. Try again in a minute."));
    } finally {
      setReminding(false);
    }
  };

  const waiting = players?.filter((p) => !p.status).length ?? 0;

  return (
    <Portal>
      <Modal visible={!!item} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">{item?.title.toUpperCase()}</Text>
          {item ? <Text style={styles.meta}>{whenLabel(item, today)}{item.place ? ` · ${item.place}` : ''}</Text> : null}
          {players ? <Text style={styles.summary}>{countsLine(totals(players))}</Text> : null}
          {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          {!players && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
          {players && !players.length ? <Text style={styles.body}>Add players in Manage Squad and they'll appear here.</Text> : null}

          {players && waiting ? (
            <Button mode="contained" icon="bell-ring-outline" onPress={remind} loading={reminding} disabled={reminding} style={styles.remind}>
              Remind families who haven&apos;t answered
            </Button>
          ) : null}

          {players ? groupSquad(players).map((group) => (
            <View key={String(group.status)} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title.toUpperCase()} ({group.players.length})</Text>
              {group.players.map((p) => (
                <View key={p.playerId} style={styles.player}>
                  <View style={styles.playerRow}>
                    <View style={styles.flex}>
                      <Text style={styles.name}>{p.number !== null ? `${p.number}. ` : ''}{p.name}</Text>
                      {p.note ? <Text style={styles.noteText}>“{p.note}”</Text> : null}
                      {p.byStaff && p.status ? <Text style={styles.meta}>Answered by a coach</Text> : null}
                      {!p.status && !p.linkedFamilies ? <Text style={styles.warn}>No family linked, so only a coach can answer</Text> : null}
                    </View>
                    <Button mode="text" compact onPress={() => setEditing(editing === p.playerId ? null : p.playerId)}
                      accessibilityLabel={`Change ${p.name}'s answer`}>
                      {editing === p.playerId ? 'Done' : 'Change'}
                    </Button>
                  </View>
                  {editing === p.playerId ? (
                    <AnswerButtons compact value={p.status} name={p.name} disabled={saving === p.playerId} onChange={(next) => answer(p, next)} />
                  ) : null}
                </View>
              ))}
            </View>
          )) : null}

          <Button mode="text" onPress={onClose} style={styles.close}>Close</Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 12, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '92%', maxWidth: 560, width: '94%', alignSelf: 'center' },
  content: { padding: 16, gap: 10 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1 },
  meta: { color: c.textLight, fontSize: 12 },
  summary: { color: c.text, fontWeight: '800' },
  body: { color: c.text, lineHeight: 21 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error, fontWeight: '700' },
  warn: { color: c.warning, fontSize: 12, fontWeight: '700', marginTop: 2 },
  loading: { marginVertical: 24 },
  remind: { alignSelf: 'stretch' },
  group: { gap: 2, marginTop: 6 },
  groupTitle: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  player: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  flex: { flex: 1 },
  name: { color: c.text, fontWeight: '800' },
  noteText: { color: c.text, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  close: { alignSelf: 'center' },
}));
