import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, FAB, Modal, Portal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { apiErrorMessage, teamTalkApi } from '../services/api';
import { CATEGORY_LABEL, MEMBER_CATEGORIES, STAFF_CATEGORIES, talkTime, type DiscussionSummary } from '../utils/teamTalk';

/**
 * Team talk: the club's conversations (the same ones as on the website).
 * Players and parents chat about matches and club news; staff also have
 * training and tactics conversations only staff can see. Supporters can't
 * join in.
 */
export default function TeamTalkScreen({ navigation }: any) {
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const fan = user?.role === 'supporter';
  const categories = staff ? STAFF_CATEGORIES : MEMBER_CATEGORIES;
  const [category, setCategory] = useState<string | null>(null);
  const [list, setList] = useState<DiscussionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ category: 'general', title: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (fan) { setLoading(false); return; }
    setError('');
    try {
      setList(await teamTalkApi.list(category));
    } catch (err) {
      setError(apiErrorMessage(err, "Team talk didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, fan]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const start = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setFormError('');
    try {
      const { id } = await teamTalkApi.start(form.category, form.title.trim());
      setCreating(false);
      navigation.navigate('TeamTalkThread', { id });
    } catch (err) {
      setFormError(apiErrorMessage(err, "That didn't start. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (fan) {
    return (
      <View style={[styles.container, styles.content]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FOR PLAYERS, PARENTS AND STAFF</Text>
          <Text style={styles.body}>Team talk is where the club&apos;s players, parents and coaches chat. Supporters can follow results and news on Home.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {[null, ...categories].map((k) => {
          const on = category === k;
          return (
            <Pressable key={k ?? 'all'} onPress={() => { setLoading(true); setCategory(k); }} style={[styles.tab, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on ? { color: c.onPrimary } : null]}>{k ? CATEGORY_LABEL[k] : 'All'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : list.length === 0 && !error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NO CONVERSATIONS YET</Text>
            <Text style={styles.body}>Start one with the button below: a match, a question for the coaches, or club news.</Text>
          </View>
        ) : list.map((d) => (
          <Pressable key={d.id} onPress={() => navigation.navigate('TeamTalkThread', { id: d.id })} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]} accessibilityRole="button" accessibilityLabel={`${d.title}, ${d.comment_count} comments`}>
            <View style={styles.row}>
              <Text style={[styles.tag, { color: c.primary }]}>{(CATEGORY_LABEL[d.category] ?? d.category).toUpperCase()}</Text>
              {d.pinned ? <Text style={styles.meta}>📌 Pinned</Text> : null}
              {d.locked ? <Text style={styles.meta}>🔒 Closed</Text> : null}
              <View style={styles.flex} />
              <MaterialCommunityIcons name="comment-outline" size={15} color={c.textLight} />
              <Text style={styles.meta}>{d.comment_count}</Text>
            </View>
            <Text style={styles.title} numberOfLines={3}>{d.title}</Text>
            <Text style={styles.meta}>Started by {d.author_name} · {talkTime(d.updated_at)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FAB icon="plus" label="Start a conversation" style={[styles.fab, { backgroundColor: c.primary }]} color={c.onPrimary} onPress={() => { setForm({ category: 'general', title: '' }); setFormError(''); setCreating(true); }} />
      <Portal>
        <Modal visible={creating} onDismiss={() => setCreating(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.cardTitle}>START A CONVERSATION</Text>
          <Text style={styles.label}>Topic</Text>
          <View style={styles.tabs}>
            {categories.map((k) => {
              const on = form.category === k;
              return (
                <Pressable key={k} onPress={() => setForm({ ...form, category: k })} style={[styles.tab, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.tabText, on ? { color: c.onPrimary } : null]}>{CATEGORY_LABEL[k]}</Text>
                </Pressable>
              );
            })}
          </View>
          {staff && (form.category === 'training' || form.category === 'tactics') ? <Text style={styles.meta}>Only coaches and club staff see {CATEGORY_LABEL[form.category].toLowerCase()} conversations.</Text> : null}
          <TextInput mode="outlined" label="What's it about?" placeholder="e.g. Saturday's win at Oadby" value={form.title} maxLength={150} onChangeText={(title) => setForm({ ...form, title })} />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button mode="contained" onPress={start} loading={saving} disabled={saving || !form.title.trim()}>Start</Button>
          <Button mode="text" onPress={() => setCreating(false)} disabled={saving}>Cancel</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 96, gap: 10 },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  tab: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  tabText: { color: c.text, fontWeight: '700', fontSize: 13 },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 6 },
  pressed: { backgroundColor: c.surfaceRaised },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  tag: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.5 },
  title: { color: c.text, fontSize: 17, fontWeight: '800', lineHeight: 22 },
  meta: { color: c.textLight, fontSize: 12 },
  label: { color: c.text, fontWeight: '700', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 18, gap: 10 },
}));
