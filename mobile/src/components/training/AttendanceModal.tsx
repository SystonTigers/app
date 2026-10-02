import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, trainingApi, type AttendancePlayer, type TrainingSession } from '../../services/api';
import { sessionDay } from '../../utils/training';

/** Staff: tick who came to a training session. */
export default function AttendanceModal({ session, onClose, onSaved }: {
  session: TrainingSession | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [players, setPlayers] = useState<AttendancePlayer[]>([]);
  const [came, setCame] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    setError('');
    setLoading(true);
    trainingApi.attendance(session.id)
      .then((list) => {
        setPlayers(list);
        setCame(new Set(list.filter((p) => p.present).map((p) => p.id)));
      })
      .catch((err) => setError(apiErrorMessage(err, "The register couldn't load.")))
      .finally(() => setLoading(false));
  }, [session]);

  const toggle = (id: string) => setCame((set) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!session) return;
    setSaving(true);
    setError('');
    try {
      const res = await trainingApi.setAttendance(session.id, [...came]);
      onSaved(`Register saved: ${res.present} of ${res.marked} came.`);
    } catch (err) {
      setError(apiErrorMessage(err, "The register didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={!!session} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>Attendance</Text>
        {session ? <Text style={styles.small}>{session.focus} · {sessionDay(session.session_date)}{session.session_time ? ` · ${session.session_time}` : ''}</Text> : null}
        <View style={styles.tools}>
          <Text style={styles.count}>{came.size} of {players.length} here</Text>
          <Pressable onPress={() => setCame(new Set(players.map((p) => p.id)))} accessibilityRole="button"><Text style={[styles.link, { color: COLORS.primary }]}>Everyone</Text></Pressable>
          <Pressable onPress={() => setCame(new Set())} accessibilityRole="button"><Text style={[styles.link, { color: COLORS.primary }]}>Nobody</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : (
          <ScrollView style={styles.list}>
            {players.map((p) => {
              const on = came.has(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.row}>
                  <MaterialCommunityIcons name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={on ? COLORS.primary : COLORS.textLight} />
                  <Text style={styles.name}>{p.name}</Text>
                  {p.number !== null ? <Text style={styles.small}>#{p.number}</Text> : null}
                </Pressable>
              );
            })}
            {!players.length ? <Text style={styles.small}>Add players in Manage Squad first.</Text> : null}
          </ScrollView>
        )}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.flex}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving || loading || !players.length} style={styles.flex}>Save register</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 16, borderRadius: 18, padding: 18, maxHeight: '92%', maxWidth: 560, alignSelf: 'center', width: '94%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text },
  small: { color: c.textLight, fontSize: 12 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 10 },
  count: { color: c.text, fontWeight: '800', flex: 1 },
  link: { fontWeight: '800' },
  loading: { marginVertical: 24 },
  list: { maxHeight: 420 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border },
  name: { color: c.text, fontWeight: '700', flex: 1 },
  error: { color: c.error, marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex: { flex: 1 },
}));
