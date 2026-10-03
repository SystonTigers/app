import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal, Searchbar, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, trainingApi, type TrainingSession } from '../../services/api';
import { localDay, totalMinutes } from '../../utils/training';
import { allDrills, filterDrills, findDrill, type AppDrill } from '../../utils/drills';
import { loadDrills, useDrills } from '../../services/drillsStore';
import { normaliseResultDate } from '../../utils/results';

const TIME = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;

/**
 * Staff: plan a training session (or change one): when, where, the focus and
 * the drills, picked from the drill library and the club's own drills (your
 * favourites are suggested first).
 */
export default function SessionFormModal({ visible, editing, onClose, onSaved }: {
  visible: boolean;
  editing: TrainingSession | null;
  onClose: () => void;
  onSaved: (session: TrainingSession, message: string) => void;
}) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [drills, setDrills] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const store = useDrills();
  const everything = useMemo(() => allDrills(store.club), [store.club]);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setQuery('');
    setDate(editing?.session_date ?? localDay(new Date()));
    setTime(editing?.session_time ?? '18:00');
    setLocation(editing?.location ?? '');
    setFocus(editing?.focus ?? '');
    setNotes(editing?.notes ?? '');
    setDrills(editing?.drills ?? []);
    void loadDrills();
  }, [visible, editing]);

  const chosen = drills.map((r) => findDrill(r, everything)).filter((d): d is AppDrill => !!d);
  const matches = useMemo(() => {
    const q = query.trim();
    // Nothing typed: suggest my favourites
    const found = q
      ? [...filterDrills(everything, { query: q }), ...everything.filter((d) => d.category.toLowerCase().includes(q.toLowerCase()))]
      : filterDrills(everything, { view: 'favourites', favourites: store.favourites });
    return [...new Map(found.map((d) => [d.ref, d])).values()].filter((d) => !drills.includes(d.ref)).slice(0, 8);
  }, [query, drills, everything, store.favourites]);

  const move = (i: number, by: number) => setDrills((list) => {
    const next = [...list];
    const j = i + by;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    const day = normaliseResultDate(date);
    const t = time.trim() ? TIME.exec(time.trim()) : null;
    if (!day) return setError('Enter the date, for example 07/10/2026.');
    if (time.trim() && !t) return setError('Enter the time like 18:30.');
    const input = {
      date: day,
      time: t ? `${t[1].padStart(2, '0')}:${t[2]}` : null,
      location: location.trim() || null,
      focus: focus.trim() || 'Training',
      notes: notes.trim() || null,
      drills,
    };
    setSaving(true);
    setError('');
    try {
      const session = editing ? await trainingApi.updateSession(editing.id, input) : await trainingApi.createSession(input);
      onSaved(session, editing ? 'Session updated.' : 'Session planned. Everyone at the club can see it in Training Centre.');
    } catch (err) {
      setError(apiErrorMessage(err, "The session didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editing ? 'Edit session' : 'Plan a session'}</Text>
          <View style={styles.row}>
            <TextInput label="Date" accessibilityLabel="Date" placeholder="07/10/2026" value={date} onChangeText={setDate} mode="outlined" style={styles.flex} />
            <TextInput label="Time" accessibilityLabel="Time" placeholder="18:30" value={time} onChangeText={setTime} mode="outlined" style={styles.time} />
          </View>
          <TextInput label="Where" accessibilityLabel="Where" placeholder="Main pitch" value={location} onChangeText={setLocation} mode="outlined" maxLength={120} style={styles.input} />
          <TextInput label="Focus" accessibilityLabel="Focus" placeholder="Passing and movement" value={focus} onChangeText={setFocus} mode="outlined" maxLength={80} style={styles.input} />

          <Text style={styles.section}>Drills{chosen.length ? ` · ${chosen.length} · about ${totalMinutes(chosen)} mins` : ''}</Text>
          {chosen.map((d, i) => (
            <View key={d.ref} style={styles.drill}>
              <Text style={styles.drillNo}>{i + 1}</Text>
              <View style={styles.flex}>
                <Text style={styles.drillName}>{d.name}</Text>
                <Text style={styles.small}>{d.category} · {d.duration}</Text>
              </View>
              <Pressable onPress={() => move(i, -1)} accessibilityLabel={`Move ${d.name} up`} hitSlop={8}><MaterialCommunityIcons name="chevron-up" size={22} color={COLORS.textLight} /></Pressable>
              <Pressable onPress={() => move(i, 1)} accessibilityLabel={`Move ${d.name} down`} hitSlop={8}><MaterialCommunityIcons name="chevron-down" size={22} color={COLORS.textLight} /></Pressable>
              <Pressable onPress={() => setDrills((list) => list.filter((r) => r !== d.ref))} accessibilityLabel={`Remove ${d.name}`} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.error} />
              </Pressable>
            </View>
          ))}
          <Searchbar placeholder="Add a drill: search passing, rondo…" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} />
          {!query.trim() && matches.length ? <Text style={styles.small}>Your favourites</Text> : null}
          {matches.map((d) => (
            <Pressable key={d.ref} onPress={() => { setDrills((list) => [...list, d.ref].slice(0, 20)); setQuery(''); }} accessibilityRole="button" style={styles.match}>
              <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.primary} />
              <View style={styles.flex}>
                <Text style={styles.drillName}>{d.name}</Text>
                <Text style={styles.small}>{d.club ? 'Our drill · ' : ''}{d.category} · {d.duration} · {d.difficulty}</Text>
              </View>
            </Pressable>
          ))}

          <TextInput label="Notes (optional)" accessibilityLabel="Notes" value={notes} onChangeText={setNotes} mode="outlined" maxLength={1000} multiline style={styles.input} />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={onClose} disabled={saving} style={styles.flex}>Cancel</Button>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={styles.flex}>{editing ? 'Save' : 'Plan session'}</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 16, borderRadius: 18, padding: 18, maxHeight: '92%', maxWidth: 600, alignSelf: 'center', width: '94%' },
  title: { fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1, textTransform: 'uppercase', color: c.text, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  time: { width: 110 },
  input: { marginBottom: 10 },
  section: { color: c.text, fontWeight: '800', marginTop: 4, marginBottom: 6 },
  drill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  drillNo: { color: c.primary, fontFamily: FONTS.display, fontSize: 20, width: 22, textAlign: 'center' },
  drillName: { color: c.text, fontWeight: '700' },
  small: { color: c.textLight, fontSize: 12 },
  search: { marginVertical: 8, backgroundColor: c.surfaceRaised },
  searchInput: { fontSize: 14 },
  match: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  error: { color: c.error, marginBottom: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
}));
