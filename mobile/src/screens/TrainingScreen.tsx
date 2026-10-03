import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import SectionTitle from '../components/home/SectionTitle';
import { FONTS } from '../theme/brandFonts';
import FeedCard from '../components/FeedCard';
import { apiErrorMessage, trainingApi, type TrainingSession } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { drillOfTheWeek, localDay, sessionDay, splitSessions, totalMinutes } from '../utils/training';
import { allDrills, findDrill, type AppDrill } from '../utils/drills';
import { loadDrills, useDrills } from '../services/drillsStore';
import SessionFormModal from '../components/training/SessionFormModal';
import AttendanceModal from '../components/training/AttendanceModal';

/**
 * Training Centre: the next session and its plan, the drill of the week and
 * recent sessions. Staff plan sessions, pick drills and take the register.
 */
export default function TrainingScreen({ navigation }: any) {
  const colors = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<{ open: boolean; editing: TrainingSession | null }>({ open: false, editing: null });
  const [register, setRegister] = useState<TrainingSession | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await trainingApi.listSessions();
      setSessions(res.data || []);
    } catch (err) {
      setError(apiErrorMessage(err, "Training sessions couldn't load. Pull down to try again."));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Club drills in session plans need the club's drill list
  const drillStore = useDrills();
  useEffect(() => { void loadDrills(); }, []);
  const everything = useMemo(() => allDrills(drillStore.club), [drillStore.club]);
  const drillsFor = (refs: string[]) => refs.map((r) => findDrill(r, everything)).filter((d): d is AppDrill => !!d);

  const { upcoming, past } = useMemo(() => splitSessions(sessions), [sessions]);
  const next = upcoming[0] ?? null;
  const later = upcoming.slice(1, 4);
  const weekDrill = useMemo(() => drillOfTheWeek(), []);
  // The register is usually taken at (or just after) a session
  const registerFor = next && next.session_date.slice(0, 10) <= localDay(new Date()) ? next : past[0] ?? next;

  const openDrill = (ref: string) => navigation.navigate('Drill', { ref });

  const remove = (s: TrainingSession) => {
    Alert.alert('Remove this session?', `${s.focus} on ${sessionDay(s.session_date)} and its register will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await trainingApi.deleteSession(s.id);
            setNotice('Session removed.');
            setSelected(null);
            load();
          } catch (err) {
            setError(apiErrorMessage(err, "That session couldn't be removed."));
          }
        },
      },
    ]);
  };

  const staffActions = (s: TrainingSession) => (
    <View style={styles.rowActions}>
      <Button compact mode="text" icon="pencil" onPress={() => setForm({ open: true, editing: s })}>Edit</Button>
      <Button compact mode="text" icon="account-check" onPress={() => setRegister(s)}>Register</Button>
      <Button compact mode="text" icon="delete-outline" textColor={colors.error} onPress={() => remove(s)}>Remove</Button>
    </View>
  );

  const sessionRow = (s: TrainingSession) => (
    <View key={s.id} style={[styles.sessionRow, { borderBottomColor: colors.border }]}>
      <Pressable onPress={() => setSelected(selected === s.id ? null : s.id)} accessibilityRole="button" style={styles.sessionMain}>
        <View style={styles.flex}>
          <Text style={[styles.sessionFocus, { color: colors.text }]}>{s.focus}</Text>
          <Text style={[styles.sessionDate, { color: colors.textLight }]}>
            {sessionDay(s.session_date)}{s.session_time ? ` · ${s.session_time}` : ''}{s.location ? ` · ${s.location}` : ''}
          </Text>
        </View>
        {s.attendance.marked ? (
          <View style={styles.attendeeBadge}>
            <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
            <Text style={[styles.attendeeCount, { color: colors.primary }]}>{s.attendance.present}</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons name={selected === s.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textLight} />
      </Pressable>
      {selected === s.id ? (
        <View style={styles.expanded}>
          {drillsFor(s.drills).map((d, i) => (
            <Pressable key={d.ref} onPress={() => openDrill(d.ref)} accessibilityRole="link">
              <Text style={[styles.planDrill, { color: colors.text }]}>{i + 1}. {d.name} <Text style={{ color: colors.textLight }}>· {d.duration}</Text></Text>
            </Pressable>
          ))}
          {!s.drills.length ? <Text style={{ color: colors.textLight, fontSize: 12 }}>No drills added.</Text> : null}
          {staff ? staffActions(s) : null}
        </View>
      ) : null}
    </View>
  );

  const nextDrills = next ? drillsFor(next.drills) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}
        {error ? <Text style={[styles.notice, { color: colors.error }]} accessibilityRole="alert">{error}</Text> : null}

        {next ? (
          <FeedCard title="NEXT SESSION">
            <View style={styles.heroContent}>
              <View style={styles.heroRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                <Text style={[styles.heroText, { color: colors.text }]}>{sessionDay(next.session_date)}</Text>
              </View>
              {next.session_time ? (
                <View style={styles.heroRow}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                  <Text style={[styles.heroText, { color: colors.text }]}>{next.session_time}</Text>
                </View>
              ) : null}
              {next.location ? (
                <View style={styles.heroRow}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
                  <Text style={[styles.heroText, { color: colors.text }]}>{next.location}</Text>
                </View>
              ) : null}
              <View style={[styles.focusBadge, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                <Text style={[styles.focusText, { color: colors.primary }]}>FOCUS: {next.focus.toUpperCase()}</Text>
              </View>
              {nextDrills.length ? (
                <View style={styles.plan}>
                  <Text style={[styles.planTitle, { color: colors.text }]}>Session plan · about {totalMinutes(nextDrills)} mins</Text>
                  {nextDrills.map((d, i) => (
                    <Pressable key={d.ref} onPress={() => openDrill(d.ref)} accessibilityRole="link" style={styles.planRow}>
                      <Text style={[styles.planNo, { color: colors.primary }]}>{i + 1}</Text>
                      <View style={styles.flex}>
                        <Text style={[styles.planDrillName, { color: colors.text }]}>{d.name}</Text>
                        <Text style={{ color: colors.textLight, fontSize: 12 }}>{d.category} · {d.duration}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textLight} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={{ color: colors.textLight, fontSize: 13 }}>{staff ? 'No drills yet. Edit the session to add some.' : 'The coaches will add the drills.'}</Text>
              )}
              {next.notes ? <Text style={[styles.notes, { color: colors.text }]}>{next.notes}</Text> : null}
              {staff ? staffActions(next) : null}
            </View>
          </FeedCard>
        ) : (
          <FeedCard title="NEXT SESSION">
            <View style={styles.heroContent}>
              <Text style={{ color: colors.textLight }}>
                {staff ? 'No session planned yet. Plan one and everyone at the club can see when and where.' : 'No session planned yet. Check back soon.'}
              </Text>
              {staff ? <Button mode="contained" style={styles.heroButton} onPress={() => setForm({ open: true, editing: null })}>Plan a session</Button> : null}
            </View>
          </FeedCard>
        )}

        <SectionTitle title="QUICK ACTIONS" color={colors.primary} />
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('DrillLibrary')} accessibilityRole="button">
            <MaterialCommunityIcons name="book-open-variant" size={32} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Drill Library</Text>
          </TouchableOpacity>
          {staff ? (
            <>
              <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setForm({ open: true, editing: null })} accessibilityRole="button">
                <MaterialCommunityIcons name="clipboard-edit" size={32} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Plan Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }, !registerFor ? styles.disabled : null]}
                onPress={() => (registerFor ? setRegister(registerFor) : setNotice('Plan a session first, then take the register.'))}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="account-check" size={32} color={colors.primary} />
                <Text style={[styles.actionLabel, { color: colors.text }]}>Attendance</Text>
                {registerFor ? <Text style={[styles.actionSub, { color: colors.textLight }]}>{sessionDay(registerFor.session_date)}</Text> : null}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <FeedCard
          title="DRILL OF THE WEEK"
          headerRight={<MaterialCommunityIcons name="star" size={20} color={colors.primary} />}
          onPress={() => openDrill(`lib:${weekDrill.id}`)}
        >
          <View style={styles.drillContent}>
            <Text style={[styles.drillName, { color: colors.text }]}>{weekDrill.name}</Text>
            <Text style={[styles.drillCategory, { color: colors.textLight }]}>{weekDrill.category}</Text>
            <Text style={{ color: colors.text, marginBottom: 12 }} numberOfLines={3}>{weekDrill.description}</Text>
            <View style={styles.drillMeta}>
              <Chip style={{ backgroundColor: colors.primarySoft }} textStyle={{ color: colors.primary, fontWeight: '700' }}>{weekDrill.difficulty.toUpperCase()}</Chip>
              <Text style={[styles.drillDuration, { color: colors.textLight }]}>{weekDrill.duration} · {weekDrill.players}</Text>
            </View>
          </View>
        </FeedCard>

        {later.length ? <FeedCard title="COMING UP">{later.map(sessionRow)}</FeedCard> : null}
        {past.length ? <FeedCard title="RECENT SESSIONS">{past.slice(0, 6).map(sessionRow)}</FeedCard> : null}
      </ScrollView>

      <SessionFormModal
        visible={form.open}
        editing={form.editing}
        onClose={() => setForm({ open: false, editing: null })}
        onSaved={(_s, message) => { setForm({ open: false, editing: null }); setNotice(message); load(); }}
      />
      <AttendanceModal
        session={register}
        onClose={() => setRegister(null)}
        onSaved={(message) => { setRegister(null); setNotice(message); load(); }}
      />
    </View>
  );
}

const useStyles = themedStyles(() => ({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  flex: { flex: 1 },
  notice: { marginHorizontal: 16, marginTop: 12, fontWeight: '700' },
  heroContent: { padding: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroText: { fontSize: 14, fontWeight: '500' },
  focusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, marginTop: 8, marginBottom: 12 },
  focusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroButton: { marginTop: 12 },
  plan: { gap: 2, marginBottom: 6 },
  planTitle: { fontWeight: '800', marginBottom: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  planNo: { fontFamily: FONTS.display, fontSize: 20, width: 20, textAlign: 'center' },
  planDrillName: { fontWeight: '700' },
  notes: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, marginLeft: -8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  actionCard: { width: '31%', minWidth: 100, flexGrow: 1, aspectRatio: 1.1, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },
  disabled: { opacity: 0.6 },
  actionLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  actionSub: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  drillContent: { padding: 16 },
  drillName: { fontFamily: FONTS.display, fontSize: 22, letterSpacing: 0.5, marginBottom: 4 },
  drillCategory: { fontSize: 12, marginBottom: 8 },
  drillMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  drillDuration: { fontSize: 12 },
  sessionRow: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  sessionMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionFocus: { fontSize: 14, fontWeight: '600' },
  sessionDate: { fontSize: 12, marginTop: 2 },
  attendeeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeeCount: { fontSize: 14, fontWeight: 'bold' },
  expanded: { paddingTop: 8, gap: 4 },
  planDrill: { fontSize: 13, paddingVertical: 2 },
}));
