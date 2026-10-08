import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, availabilityApi } from '../services/api';
import ItemCard from '../components/availability/ItemCard';
import SquadSheet from '../components/availability/SquadSheet';
import LinkChildCard from '../components/consent/LinkChildCard';
import { ukToday, unanswered, type Answer, type AvailabilityItem, type AvailabilityOverview, type ChildAnswer, type Counts } from '../utils/availability';

/**
 * Availability: for each match, training session and club event in the next
 * four weeks, families say whether their child can make it (with a note for
 * the coach if not). Staff also see the squad's totals for each one, open
 * the full list, answer for a child and remind families who haven't answered.
 */
export default function AvailabilityScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [data, setData] = useState<AvailabilityOverview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [open, setOpen] = useState<AvailabilityItem | null>(null);
  const today = ukToday();

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await availabilityApi.overview());
    } catch (err) {
      setError(apiErrorMessage(err, "Availability didn't load. Check your signal and pull to refresh."));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patchChild = (item: AvailabilityItem, playerId: string, patch: Partial<ChildAnswer>) => {
    setData((d) => d && {
      ...d,
      items: d.items.map((i) => (i.type === item.type && i.id === item.id
        ? { ...i, children: i.children.map((ch) => (ch.playerId === playerId ? { ...ch, ...patch } : ch)) }
        : i)),
    });
  };

  const answer = async (item: AvailabilityItem, child: ChildAnswer, status: Answer | null, note: string | null) => {
    setNotice(''); setError(''); setSaving(child.playerId);
    // Show the answer straight away; put it back if it doesn't save
    patchChild(item, child.playerId, { status, note });
    try {
      const saved = await availabilityApi.answer(item.type, item.id, child.playerId, status, note);
      patchChild(item, child.playerId, { status: saved.status, note: saved.note });
      if (data?.staff) load();
    } catch (err) {
      patchChild(item, child.playerId, { status: child.status, note: child.note });
      setError(apiErrorMessage(err, "That didn't save. Check your signal and try again."));
    } finally {
      setSaving(null);
    }
  };

  const setCounts = (item: AvailabilityItem, counts: Counts) => {
    setData((d) => d && { ...d, items: d.items.map((i) => (i.type === item.type && i.id === item.id ? { ...i, counts } : i)) });
  };

  if (!data && !error) return <View style={styles.container}><ActivityIndicator color={c.primary} style={styles.loading} /></View>;

  const left = data ? unanswered(data.items).length : 0;
  const noChildren = data && !data.staff && !data.children.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{data?.staff ? "WHO'S AVAILABLE" : 'CAN THEY MAKE IT?'}</Text>
        <Text style={styles.body}>
          {data?.staff
            ? 'Matches, training and events for the next four weeks. Open one to see the squad, answer for a player or remind families.'
            : 'Let the coaches know who can make each match, training session and event. You can change your answer any time.'}
        </Text>
        {data && data.children.length && left ? <Text style={styles.left}>{left} still to answer</Text> : null}
        {data && data.children.length && !left && data.items.length ? <Text style={styles.done}>All answered. Thank you!</Text> : null}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
          {!data ? <Button mode="outlined" onPress={() => { setError(''); load(); }}>Try again</Button> : null}
        </View>
      ) : null}

      {noChildren ? (
        <>
          <Text style={styles.body}>Link your account to your child first, with the code from their coach.</Text>
          <LinkChildCard prominent onLinked={(name) => { setNotice(`Linked to ${name}. You can answer for them now.`); load(); }} />
        </>
      ) : null}

      {data && !noChildren && !data.items.length ? (
        <Text style={styles.body}>
          {data.staff
            ? 'Nothing in the next four weeks. Add fixtures, training sessions or events and families can answer here.'
            : "Nothing to answer in the next four weeks. When the coaches add matches or training, they'll appear here."}
        </Text>
      ) : null}

      {!noChildren && data?.items.map((item) => (
        <ItemCard
          key={`${item.type}:${item.id}`}
          item={item}
          today={today}
          saving={saving}
          onAnswer={(child, status, note) => answer(item, child, status, note)}
          onOpenSquad={data.staff ? () => setOpen(item) : undefined}
        />
      ))}

      <SquadSheet item={open} today={today} onClose={() => { setOpen(null); load(); }} onChanged={(counts) => { if (open) setCounts(open, counts); }} />
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  body: { color: c.text, lineHeight: 21 },
  left: { color: c.warning, fontWeight: '800' },
  done: { color: c.success, fontWeight: '800' },
  notice: { color: c.success, fontWeight: '700' },
  errorBox: { gap: 8 },
  error: { color: c.error },
}));
