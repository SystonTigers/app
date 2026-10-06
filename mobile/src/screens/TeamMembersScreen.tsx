import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, clubMembersApi, type ClubMember, type ClubRole } from '../services/api';
import { isStaffRole } from '../utils/roles';
import { ASSIGNABLE_ROLES, filterMembers, initialsOf, lastSeen, linkedLabel, ROLE_INFO, signedUpLabel, sortMembers, type MemberFilter } from '../utils/members';

/** What a waiting sign-up said they are */
function joinAsLabel(joinAs: ClubMember['joinAs']): string {
  if (joinAs === 'coach') return 'Says they are a coach (joins as a supporter until you make them one)';
  if (joinAs === 'player') return 'Player';
  if (joinAs === 'supporter') return 'Supporter';
  return 'Parent';
}

const FILTERS: Array<{ id: MemberFilter; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'staff', label: 'Staff' },
  { id: 'player', label: 'Players' },
  { id: 'parent', label: 'Parents' },
  { id: 'supporter', label: 'Supporters' },
];

/**
 * Staff: everyone with an account at the club. Club admins tap someone to
 * change what they can do (the change applies when that person next signs in).
 */
export default function TeamMembersScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [canChange, setCanChange] = useState(false);
  const [me, setMe] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ClubMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await clubMembersApi.list();
      setMembers(res.data.members);
      setCanChange(res.data.canChangeRoles);
      setMe(res.data.me);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load the club's members. Check your signal and try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // New sign-ups waiting to be let in are listed on their own, above everyone else
  const waiting = useMemo(() => members.filter((m) => m.role === 'pending'), [members]);
  const joined = useMemo(() => members.filter((m): m is ClubMember & { role: ClubRole | 'owner' } => m.role !== 'pending'), [members]);
  const shown = useMemo(() => sortMembers(filterMembers(joined, filter, query)), [joined, filter, query]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, filterMembers(joined, f.id, '').length])), [joined]);
  const [deciding, setDeciding] = useState('');

  const decide = async (member: ClubMember, letIn: boolean) => {
    setDeciding(member.id);
    setError('');
    setMessage('');
    try {
      if (letIn) {
        const updated = await clubMembersApi.approve(member.id);
        setMembers((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        setMessage(`${member.name} is in. They'll see everything next time they open the app.`);
      } else {
        await clubMembersApi.decline(member.id);
        setMembers((list) => list.filter((m) => m.id !== member.id));
        setMessage(`${member.name} was turned away and their account removed.`);
      }
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setDeciding('');
    }
  };

  const changeRole = async (member: ClubMember, role: ClubRole) => {
    // Same role and nothing to answer: nothing to do (choosing it still answers a coach request)
    if (member.role === role && member.requestedRole !== 'coach') { setEditing(null); return; }
    setSaving(true);
    setError('');
    try {
      const updated = (await clubMembersApi.setRole(member.id, role)).data;
      setMembers((list) => list.map((m) => (m.id === updated.id ? updated : m)));
      setMessage(`${updated.name} is now ${ROLE_INFO[role].label === 'Admin' ? 'an admin' : `a ${ROLE_INFO[role].label.toLowerCase()}`}. It applies next time they sign in.`);
      setEditing(null);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={c.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
      >
        <Text style={styles.intro}>
          {joined.length} {joined.length === 1 ? 'person has' : 'people have'} an account at the club.
          {canChange ? ' Tap someone to change what they can do.' : ''}
        </Text>

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={c.textLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or email"
            placeholderTextColor={c.textLight}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search members"
          />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={[styles.filter, on && { backgroundColor: c.primary, borderColor: c.primary }]}>
                <Text style={[styles.filterText, on && { color: c.onPrimary }]}>{f.label} ({counts[f.id]})</Text>
              </Pressable>
            );
          })}
        </View>

        {message ? <Text style={styles.message} accessibilityRole="alert">{message}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        {waiting.length ? (
          <View style={[styles.waitingBox, { borderColor: c.primary }]} testID="waiting-to-join">
            <Text style={styles.waitingTitle}>WAITING TO JOIN ({waiting.length})</Text>
            <Text style={styles.small}>Only let in people you know: once in, they can see fixtures, training, grounds and times.</Text>
            {waiting.map((m) => (
              <View key={m.id} style={styles.waitingRow}>
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.small} numberOfLines={1}>{m.email}</Text>
                  <Text style={styles.small}>{joinAsLabel(m.joinAs)} · {signedUpLabel(m.joinedAt)}</Text>
                </View>
                <View style={styles.waitingButtons}>
                  <Button mode="contained" compact onPress={() => decide(m, true)} disabled={!!deciding} loading={deciding === m.id} accessibilityLabel={`Let ${m.name} in`}>Let in</Button>
                  <Button mode="text" compact onPress={() => decide(m, false)} disabled={!!deciding} accessibilityLabel={`Turn ${m.name} away`}>Turn away</Button>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {shown.map((m) => {
          const editable = canChange && m.role !== 'owner' && m.id !== me;
          return (
            <Pressable
              key={m.id}
              onPress={editable ? () => { setMessage(''); setEditing(m); } : undefined}
              disabled={!editable}
              accessibilityRole={editable ? 'button' : undefined}
              accessibilityLabel={`${m.name}, ${ROLE_INFO[m.role].label}${editable ? '. Change role' : ''}`}
              style={({ pressed }) => [styles.row, pressed && editable ? styles.pressed : null]}
            >
              <View style={[styles.avatar, { borderColor: !isStaffRole(m.role) ? c.border : c.primary }]}>
                <Text style={styles.avatarText}>{initialsOf(m.name)}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>{m.name}{m.id === me ? ' (you)' : ''}</Text>
                <Text style={styles.small} numberOfLines={1}>{m.email}</Text>
                {m.requestedRole === 'coach' ? (
                  <Text style={[styles.small, { color: c.primary, fontWeight: '800' }]}>Asked to be a coach{canChange ? ': tap to approve' : ''}</Text>
                ) : null}
                <Text style={styles.small}>
                  {lastSeen(m.lastLoginAt)}{m.linkedPlayers ? ` · ${linkedLabel(m.role, m.linkedPlayers)}` : ''}
                </Text>
              </View>
              <View style={[styles.rolePill, isStaffRole(m.role) ? { backgroundColor: c.primarySoft, borderColor: c.primary } : null]}>
                <Text style={[styles.roleText, isStaffRole(m.role) ? { color: c.primary } : null]}>{ROLE_INFO[m.role].label}</Text>
              </View>
              {editable ? <MaterialCommunityIcons name="chevron-right" size={20} color={c.textLight} /> : null}
            </Pressable>
          );
        })}
        {!shown.length ? <Text style={styles.empty}>{joined.length ? 'Nobody matches.' : 'Nobody has signed up yet. Share the club link so families can join.'}</Text> : null}
      </ScrollView>

      <Portal>
        <Modal visible={!!editing} onDismiss={() => !saving && setEditing(null)} contentContainerStyle={styles.modal}>
          {editing ? (
            <>
              <Text style={styles.modalTitle}>{editing.name}</Text>
              <Text style={styles.small}>
                {editing.requestedRole === 'coach'
                  ? 'They asked to be a coach when they signed up. Choose Coach to approve, or keep them as they are. It applies next time they sign in.'
                  : 'Choose what they can do. It applies next time they sign in.'}
              </Text>
              {ASSIGNABLE_ROLES.map((role) => {
                const current = editing.role === role;
                return (
                  <Pressable key={role} onPress={() => changeRole(editing, role)} disabled={saving} accessibilityRole="button" accessibilityState={{ selected: current }}
                    style={[styles.option, current && { borderColor: c.primary, backgroundColor: c.primarySoft }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, current && { color: c.primary }]}>{ROLE_INFO[role].label}</Text>
                      <Text style={styles.small}>{ROLE_INFO[role].description}</Text>
                    </View>
                    {current ? <MaterialCommunityIcons name="check-circle" size={22} color={c.primary} /> : null}
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setEditing(null)} disabled={saving} accessibilityRole="button" style={styles.cancel}>
                {saving ? <ActivityIndicator color={c.primary} /> : <Text style={[styles.cancelText, { color: c.primary }]}>Cancel</Text>}
              </Pressable>
            </>
          ) : null}
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: { color: c.textLight, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  filterText: { color: c.text, fontWeight: '700', fontSize: 13 },
  message: { color: c.primary, fontWeight: '600' },
  error: { color: c.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 12 },
  pressed: { backgroundColor: c.surfaceRaised },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceRaised },
  avatarText: { color: c.text, fontFamily: FONTS.display, fontSize: 18 },
  rowBody: { flex: 1, minWidth: 0 },
  name: { color: c.text, fontWeight: '800', fontSize: 15 },
  small: { color: c.textLight, fontSize: 12, marginTop: 1 },
  rolePill: { borderRadius: 999, borderWidth: 1, borderColor: c.border, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { color: c.textLight, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  waitingBox: { backgroundColor: c.surface, borderWidth: 1, borderRadius: 18, padding: 12, gap: 8 },
  waitingTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  waitingButtons: { alignItems: 'flex-end' },
  empty: { color: c.textLight, textAlign: 'center', paddingVertical: 24 },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, gap: 8 },
  modalTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 24, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12 },
  optionTitle: { color: c.text, fontWeight: '800', fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontWeight: '800', fontSize: 15 },
}));
