import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, reportsApi } from '../services/api';
import { REPORT_STATUSES, actionLabel, reasonLabel, reportTypeLabel, type ContentReport } from '../utils/reports';
import { talkTime } from '../utils/teamTalk';

/**
 * Staff: posts and Team Talk messages members have reported (the website's
 * Admin → Reports). Remove it takes it down; Warn them and Dismiss leave it.
 */
export default function ReportsScreen({ navigation }: any) {
  const c = useBrandColors();
  const styles = useStyles();
  const [status, setStatus] = useState('pending');
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setReports(await reportsApi.list(status));
    } catch (err) {
      setError(apiErrorMessage(err, "Reports didn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (r: ContentReport, next: 'actioned' | 'dismissed', action: 'removed' | 'warned' | 'no_action', done: string) => {
    setBusy(r.id); setNotice(''); setError('');
    try {
      await reportsApi.update(r.id, next, action);
      setNotice(done);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setBusy(null);
    }
  };
  const remove = (r: ContentReport) => Alert.alert('Remove it?', r.content_type === 'message' ? 'The whole conversation and its comments are deleted.' : r.content_type === 'comment' ? 'The comment and any replies are deleted.' : 'The post is deleted.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => act(r, 'actioned', 'removed', 'Removed.') },
  ]);

  const statusLabel = REPORT_STATUSES.find((s) => s.id === status)?.label.toLowerCase() ?? status;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {REPORT_STATUSES.map((s) => {
          const on = status === s.id;
          return (
            <Pressable key={s.id} onPress={() => { setLoading(true); setNotice(''); setStatus(s.id); }} style={[styles.tab, on ? { backgroundColor: c.primary, borderColor: c.primary } : null]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on ? { color: c.onPrimary } : null]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {loading ? <ActivityIndicator color={c.primary} style={styles.loading} /> : reports.length === 0 && !error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NOTHING {statusLabel.toUpperCase()}</Text>
            <Text style={styles.body}>{status === 'pending' ? 'When a member reports a post or message, it shows here for you to look at.' : 'Reports you deal with move here.'}</Text>
          </View>
        ) : reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.tag, { color: c.primary }]}>{reportTypeLabel(r.content_type).toUpperCase()}</Text>
              <View style={styles.flex} />
              {actionLabel(r.action_taken) ? <Text style={styles.meta}>{actionLabel(r.action_taken)}</Text> : null}
            </View>
            <Text style={styles.reason}>{reasonLabel(r.reason)}</Text>
            <Text style={styles.meta}>{talkTime(r.created_at)}{r.reporter_email ? ` · reported by ${r.reporter_email}` : ''}</Text>
            {r.content_preview ? (
              <View style={styles.quote}>
                {r.content_author ? <Text style={styles.author}>{r.content_author}</Text> : null}
                <Text style={styles.body} numberOfLines={6}>{r.content_preview}</Text>
              </View>
            ) : <Text style={styles.meta}>{status === 'pending' ? 'It has already been deleted.' : ''}</Text>}
            {r.details ? <Text style={styles.body}><Text style={styles.author}>What they said: </Text>{r.details}</Text> : null}
            {r.discussion_id && r.content_preview ? (
              <Button compact mode="text" icon="forum-outline" style={styles.start} onPress={() => navigation.navigate('TeamTalkThread', { id: r.discussion_id })}>Open the conversation</Button>
            ) : null}
            {status === 'pending' ? (
              busy === r.id ? <ActivityIndicator color={c.primary} /> : (
                <View style={styles.row}>
                  {r.content_preview ? <Button compact mode="contained" buttonColor={c.error} textColor="#FFFFFF" onPress={() => remove(r)}>Remove it</Button> : null}
                  <Button compact mode="outlined" onPress={() => act(r, 'actioned', 'warned', 'Marked as warned. Have a word with them.')}>Warn them</Button>
                  <Button compact mode="text" onPress={() => act(r, 'dismissed', 'no_action', 'Report dismissed.')}>Dismiss</Button>
                </View>
              )
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: { borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  tabText: { color: c.text, fontWeight: '700', fontSize: 13 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 6 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  tag: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.5 },
  reason: { color: c.text, fontFamily: FONTS.display, fontSize: 24 },
  body: { color: c.text, lineHeight: 21 },
  author: { color: c.text, fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  quote: { backgroundColor: c.surfaceRaised, borderRadius: 12, padding: 10, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  start: { alignSelf: 'flex-start' },
}));
