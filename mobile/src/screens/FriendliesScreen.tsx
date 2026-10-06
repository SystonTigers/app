import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, friendliesApi } from '../services/api';
import { resultDate } from '../utils/results';
import { parseDueDate } from '../utils/dues';
import {
  AGE_GROUPS, PITCH, STATUS, TABS, WHERE, blankPost, clubName, postBody, postTags,
  type FriendliesTab, type FriendlyOffer, type FriendlyPost,
} from '../utils/friendlies';

/**
 * Staff: the friendlies board shared by every club on Boost Huddle (the
 * website's Friendlies). Find a club looking for a game and offer one, or
 * post that you need a game and accept an offer: accepting adds the
 * friendly to both clubs' fixtures.
 */
export default function FriendliesScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const [tab, setTab] = useState<FriendliesTab>('browse');
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [posting, setPosting] = useState<ReturnType<typeof blankPost> | null>(null);
  const [offering, setOffering] = useState<FriendlyPost | null>(null);
  const [offerForm, setOfferForm] = useState({ date: '', message: '' });
  const [accepting, setAccepting] = useState<FriendlyOffer | null>(null);
  const [acceptDate, setAcceptDate] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (which: FriendliesTab) => {
    setError('');
    try {
      setRows(await friendliesApi.list(which));
    } catch (err) {
      setError(apiErrorMessage(err, "Friendlies didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { setLoading(true); load(tab); }, [tab, load]);

  const go = (next: FriendliesTab, message: string) => {
    setNotice(message);
    if (next === tab) load(tab); else setTab(next);
  };

  const sendPost = async () => {
    if (!posting) return;
    const body = postBody(posting);
    if (typeof body === 'string') { setFormError(body); return; }
    setBusy(true); setFormError('');
    try {
      await friendliesApi.post(body);
      setPosting(null);
      go('mine', 'Posted. Other clubs can now offer you a game.');
    } catch (err) { setFormError(apiErrorMessage(err, "Your post didn't save. Please try again.")); } finally { setBusy(false); }
  };

  const sendOffer = async () => {
    if (!offering) return;
    const date = parseDueDate(offerForm.date);
    if (!date) { setFormError('Pick a date for the game, like 10/05/2027.'); return; }
    setBusy(true); setFormError('');
    try {
      await friendliesApi.offer(offering.id, { proposed_date: date, message: offerForm.message.trim() });
      setOffering(null);
      setNotice(`Offer sent to ${clubName(offering)}. You'll see their reply under Sent.`);
    } catch (err) { setFormError(apiErrorMessage(err, "Your offer didn't send. Please try again.")); } finally { setBusy(false); }
  };

  const respond = async (m: FriendlyOffer, action: 'accept' | 'decline', date?: string) => {
    setBusy(true); setError(''); setNotice(''); setFormError('');
    try {
      await friendliesApi.respond(m.id, action, date);
      setAccepting(null);
      go('inbox', action === 'accept' ? 'Game on! The friendly is in both clubs’ fixtures.' : 'Offer declined.');
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'DATE_NEEDED') { setAcceptDate(''); setAccepting(m); }
      else if (accepting) setFormError(apiErrorMessage(err, "That reply didn't save. Please try again."));
      else setError(apiErrorMessage(err, "That reply didn't save. Please try again."));
    } finally { setBusy(false); }
  };
  const confirmAccept = () => {
    if (!accepting) return;
    const date = parseDueDate(acceptDate);
    if (!date) { setFormError('Pick the date you agreed, like 10/05/2027.'); return; }
    respond(accepting, 'accept', date);
  };

  const takeDown = (p: FriendlyPost) => Alert.alert('Take this post down?', 'Clubs won’t see it any more.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Take down', style: 'destructive', onPress: async () => {
      try { await friendliesApi.remove(p.id); go('mine', 'Post taken down.'); } catch (err) { setError(apiErrorMessage(err, "That post wasn't taken down. Please try again.")); }
    } },
  ]);

  const Badge = ({ name, url }: { name: string; url?: string | null }) => url
    ? <Image source={{ uri: url }} style={styles.badge} accessibilityLabel={`${name} badge`} />
    : <View style={[styles.badge, styles.badgeBlank]}><Text style={[styles.badgeText, { color: c.primary }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text></View>;
  const Tags = ({ tags }: { tags: string[] }) => <View style={styles.tags}>{tags.map((t) => <Text key={t} style={styles.tag}>{t}</Text>)}</View>;
  const Status = ({ status }: { status: string }) => (
    <Text style={[styles.status, { color: status === 'accepted' || status === 'open' ? c.primary : status === 'pending' ? c.warning : c.textLight }]}>{(STATUS[status] ?? status).toUpperCase()}</Text>
  );
  const Empty = ({ title, text }: { title: string; text: string }) => (
    <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{text}</Text></View>
  );
  const Chips = ({ options, value, onPick }: { options: Array<[string, string]>; value: string; onPick: (v: string) => void }) => (
    <View style={styles.tags}>
      {options.map(([v, l]) => {
        const on = value === v;
        return (
          <Pressable key={v} onPress={() => onPick(v)} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
            <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const pending = tab === 'inbox' ? (rows as FriendlyOffer[]).filter((m) => m.status === 'pending').length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => { setNotice(''); setTab(t.id); }} style={[styles.chip, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on ? { color: c.onPrimary } : null]}>{t.label}{t.id === 'inbox' && pending ? ` (${pending})` : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(tab); }} tintColor={c.primary} />}>
        <Button mode="contained" icon="plus" onPress={() => { setFormError(''); setPosting(blankPost()); }}>We need a game</Button>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : tab === 'browse' ? (
          rows.length === 0 ? <Empty title="NO CLUBS LOOKING RIGHT NOW" text="Post that you need a game and other clubs can offer you one." /> : (rows as FriendlyPost[]).map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.row}>
                <Badge name={clubName(p)} url={p.badge_url} />
                <View style={styles.flex}>
                  <Text style={styles.title}>{clubName(p)}</Text>
                  <Tags tags={postTags(p)} />
                </View>
              </View>
              {p.notes ? <Text style={styles.body}>{p.notes}</Text> : null}
              <Button mode="outlined" style={styles.start} onPress={() => { setFormError(''); setOfferForm({ date: '', message: '' }); setOffering(p); }}>Offer a game</Button>
            </View>
          ))
        ) : tab === 'mine' ? (
          rows.length === 0 ? <Empty title="NO POSTS YET" text={'Tap “We need a game” to tell other clubs you’re looking.'} /> : (rows as FriendlyPost[]).map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.row}>
                <Status status={p.status} />
                {(p.pending_count ?? 0) > 0 ? <Text style={[styles.status, { color: c.warning }]}>{p.pending_count} {p.pending_count === 1 ? 'OFFER' : 'OFFERS'} WAITING</Text> : null}
              </View>
              <Tags tags={postTags(p)} />
              {p.notes ? <Text style={styles.body}>{p.notes}</Text> : null}
              <Button compact mode="text" icon="delete-outline" textColor={c.error} style={styles.start} onPress={() => takeDown(p)}>Take down</Button>
            </View>
          ))
        ) : tab === 'inbox' ? (
          rows.length === 0 ? <Empty title="NO OFFERS YET" text="When a club offers you a game, it shows here for you to accept or decline." /> : (rows as FriendlyOffer[]).map((m) => {
            const name = m.requester_display_name || m.requester_team_name;
            return (
              <View key={m.id} style={styles.card}>
                <View style={styles.row}>
                  <Badge name={name} url={m.requester_badge_url} />
                  <View style={styles.flex}>
                    <Text style={styles.title}>{name}</Text>
                    {m.proposed_date ? <Text style={styles.meta}>{resultDate(m.proposed_date)}</Text> : <Text style={styles.meta}>No date suggested</Text>}
                  </View>
                </View>
                {m.message ? <Text style={styles.body}>{m.message}</Text> : null}
                {m.status === 'pending' ? (
                  <View style={styles.row}>
                    <Button mode="contained" onPress={() => respond(m, 'accept')} disabled={busy}>Accept</Button>
                    <Button mode="outlined" onPress={() => respond(m, 'decline')} disabled={busy}>Decline</Button>
                  </View>
                ) : <Status status={m.status} />}
              </View>
            );
          })
        ) : (
          rows.length === 0 ? <Empty title="NO OFFERS SENT" text={'Offer a game to a club under “Find a game” and its reply shows here.'} /> : (rows as FriendlyOffer[]).map((m) => (
            <View key={m.id} style={styles.card}>
              <Text style={styles.title}>To {m.host_team_name ?? 'another club'}</Text>
              {m.proposed_date ? <Text style={styles.meta}>{resultDate(m.proposed_date)}</Text> : null}
              <Status status={m.status} />
            </View>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal visible={!!posting} onDismiss={() => setPosting(null)} contentContainerStyle={styles.modal}>
          {posting ? (
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.cardTitle}>WE NEED A GAME</Text>
              <Text style={styles.label}>Age group</Text>
              <Chips options={AGE_GROUPS.map((a) => [a, a])} value={posting.age_group} onPick={(age_group) => setPosting({ ...posting, age_group })} />
              <Text style={styles.label}>Where</Text>
              <Chips options={Object.entries(WHERE)} value={posting.location_pref} onPick={(location_pref) => setPosting({ ...posting, location_pref })} />
              <Text style={styles.label}>Pitch</Text>
              <Chips options={[['any', 'Any'], ...Object.entries(PITCH)]} value={posting.pitch_type} onPick={(pitch_type) => setPosting({ ...posting, pitch_type })} />
              <TextInput mode="outlined" label="Travel up to (miles)" keyboardType="number-pad" value={posting.max_travel_miles} onChangeText={(max_travel_miles) => setPosting({ ...posting, max_travel_miles })} />
              <TextInput mode="outlined" label="Our kit colours (to avoid a clash)" placeholder="e.g. Red and white" value={posting.kit_colors} maxLength={60} onChangeText={(kit_colors) => setPosting({ ...posting, kit_colors })} />
              <TextInput mode="outlined" label="Anything else" placeholder="Dates and times that suit you" multiline value={posting.notes} maxLength={500} onChangeText={(notes) => setPosting({ ...posting, notes })} />
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <Button mode="contained" onPress={sendPost} loading={busy} disabled={busy}>Post</Button>
              <Button mode="text" onPress={() => setPosting(null)} disabled={busy}>Cancel</Button>
            </ScrollView>
          ) : null}
        </Modal>
        <Modal visible={!!offering} onDismiss={() => setOffering(null)} contentContainerStyle={styles.modal}>
          <View style={styles.modalBody}>
            <Text style={styles.cardTitle}>OFFER A GAME</Text>
            <Text style={styles.body}>To <Text style={styles.strong}>{offering ? clubName(offering) : ''}</Text></Text>
            <TextInput mode="outlined" label="Date" placeholder="10/05/2027" value={offerForm.date} onChangeText={(date) => setOfferForm({ ...offerForm, date })} />
            <TextInput mode="outlined" label="Message (optional)" placeholder="Say hello and suggest a kick-off time" multiline maxLength={500} value={offerForm.message} onChangeText={(message) => setOfferForm({ ...offerForm, message })} />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button mode="contained" onPress={sendOffer} loading={busy} disabled={busy}>Send offer</Button>
            <Button mode="text" onPress={() => setOffering(null)} disabled={busy}>Cancel</Button>
          </View>
        </Modal>
        <Modal visible={!!accepting} onDismiss={() => setAccepting(null)} contentContainerStyle={styles.modal}>
          <View style={styles.modalBody}>
            <Text style={styles.cardTitle}>WHEN IS THE GAME?</Text>
            <Text style={styles.body}>{accepting ? `${accepting.requester_display_name || accepting.requester_team_name} didn't suggest a date. Agree one with them, then put it here.` : ''}</Text>
            <TextInput mode="outlined" label="Date" placeholder="10/05/2027" value={acceptDate} onChangeText={setAcceptDate} />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <Button mode="contained" onPress={confirmAccept} loading={busy} disabled={busy}>Accept</Button>
            <Button mode="text" onPress={() => setAccepting(null)} disabled={busy}>Cancel</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipText: { color: c.text, fontWeight: '700', fontSize: 13 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, lineHeight: 24 },
  body: { color: c.text, lineHeight: 21 },
  strong: { fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  label: { color: c.text, fontWeight: '700', marginTop: 4 },
  status: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, gap: 4 },
  start: { alignSelf: 'flex-start' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: c.textLight, fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, overflow: 'hidden' },
  badge: { width: 48, height: 48, borderRadius: 12, resizeMode: 'contain' },
  badgeBlank: { backgroundColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: FONTS.display, fontSize: 22 },
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '90%' },
  modalBody: { padding: 18, gap: 10 },
}));
