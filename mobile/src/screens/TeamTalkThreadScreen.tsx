import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import { apiErrorMessage, teamTalkApi } from '../services/api';
import ReportSheet from '../components/reports/ReportSheet';
import type { ReportType } from '../utils/reports';
import { CATEGORY_LABEL, insertMention, mentionQuery, splitTimes, talkTime, videoAt, type Discussion, type TalkComment } from '../utils/teamTalk';

/**
 * One Team talk conversation: comments and replies, @mentions (they get a
 * notification), and video moments like [12:34] that open the match video
 * there. Staff can pin, close or delete it; the person who started it can
 * delete it.
 */
export default function TeamTalkThreadScreen({ route, navigation }: any) {
  const id: string = route.params?.id ?? '';
  const c = useBrandColors();
  const styles = useStyles();
  const { user } = useAuth();
  const staff = isStaffRole(user?.role);
  const [d, setD] = useState<Discussion | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<TalkComment | null>(null);
  const [mentions, setMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [posting, setPosting] = useState(false);
  const [reporting, setReporting] = useState<{ type: ReportType; id: string; what: string } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setD(await teamTalkApi.get(id));
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) setMissing(true);
      else setError(apiErrorMessage(err, "This conversation didn't load. Pull to refresh."));
    } finally {
      setRefreshing(false);
    }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // @mention suggestions while typing "@na"
  const query = mentionQuery(text);
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return undefined; }
    let cancelled = false;
    const t = setTimeout(() => teamTalkApi.searchMembers(query).then((r) => { if (!cancelled) setSuggestions(r.slice(0, 5)); }).catch(() => undefined), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const post = async () => {
    if (!text.trim() || !d) return;
    setPosting(true); setError('');
    try {
      // Only people whose @name is still in the comment get told
      const ids = mentions.filter((m) => text.includes(`@${m.name}`)).map((m) => m.id);
      await teamTalkApi.comment(d.id, text.trim(), replyTo?.id ?? null, ids);
      setText(''); setReplyTo(null); setMentions([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Your comment didn't post. Please try again."));
    } finally {
      setPosting(false);
    }
  };

  const toggle = async (patch: { pinned?: boolean; locked?: boolean }) => {
    if (!d) return;
    try { await teamTalkApi.update(d.id, patch); load(); } catch (err) { setError(apiErrorMessage(err, "That didn't save. Please try again.")); }
  };
  const remove = () => d && Alert.alert('Delete this conversation?', 'Its comments are deleted too. This can\'t be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await teamTalkApi.remove(d.id); navigation.goBack(); } catch (err) { setError(apiErrorMessage(err, "That wasn't deleted. Please try again.")); }
    } },
  ]);

  const removeComment = (comment: TalkComment) => Alert.alert('Delete this comment?', (comment.replies ?? []).length ? 'Its replies are deleted too.' : "This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await teamTalkApi.removeComment(comment.id); load(); } catch (err) { setError(apiErrorMessage(err, "That wasn't deleted. Please try again.")); }
    } },
  ]);

  const video = d?.video_id && /^https?:/.test(d.video_id) ? d.video_id : null;
  const canDelete = !!d && (staff || d.author_id === user?.userId);

  const Body = ({ content }: { content: string }) => (
    <Text style={styles.body}>
      {splitTimes(content).map((p, i) => p.type === 'text' ? <Text key={i}>{p.value}</Text> : (
        <Text key={i} style={[styles.time, { color: c.primary }]} onPress={video ? () => Linking.openURL(videoAt(video, p.seconds)) : undefined} accessibilityRole={video ? 'link' : undefined}>{p.display}</Text>
      ))}
    </Text>
  );

  const Thread = ({ comment, depth }: { comment: TalkComment; depth: number }) => (
    <View style={[styles.comment, depth ? styles.reply : null]}>
      <Text style={styles.author}>{comment.author_name} <Text style={styles.meta}>· {talkTime(comment.created_at)}</Text></Text>
      <Body content={comment.content} />
      <View style={styles.actions}>
        {!d?.locked && depth === 0 ? <Text style={[styles.replyLink, { color: c.primary }]} onPress={() => setReplyTo(comment)} accessibilityRole="button">Reply</Text> : null}
        {comment.author_id && comment.author_id !== user?.userId ? <Text style={styles.actionLink} onPress={() => setReporting({ type: 'comment', id: comment.id, what: 'comment' })} accessibilityRole="button" accessibilityLabel={`Report ${comment.author_name}'s comment`}>Report</Text> : null}
        {staff || (comment.author_id && comment.author_id === user?.userId) ? <Text style={[styles.actionLink, { color: c.error }]} onPress={() => removeComment(comment)} accessibilityRole="button" accessibilityLabel="Delete comment">Delete</Text> : null}
      </View>
      {(comment.replies ?? []).map((r) => <Thread key={r.id} comment={r} depth={depth + 1} />)}
    </View>
  );

  if (missing) {
    return (
      <View style={[styles.container, styles.content]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CONVERSATION NOT FOUND</Text>
          <Text style={styles.body}>It may have been removed, or it&apos;s only for coaches.</Text>
          <Button mode="contained" onPress={() => navigation.navigate('TeamTalk')}>Back to Team talk</Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />} keyboardShouldPersistTaps="handled">
        {!d && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {d ? (
          <>
            <View style={styles.card}>
              <Text style={[styles.tag, { color: c.primary }]}>{(CATEGORY_LABEL[d.category] ?? d.category).toUpperCase()}{d.pinned ? '  · 📌 PINNED' : ''}{d.locked ? '  · 🔒 CLOSED' : ''}</Text>
              <Text style={styles.big}>{d.title}</Text>
              <Text style={styles.meta}>Started by {d.author_name} · {talkTime(d.created_at)}</Text>
              {video ? <Button mode="outlined" icon="play-circle-outline" onPress={() => Linking.openURL(video)}>Watch the video</Button> : null}
              <View style={styles.row}>
                {staff ? <Button compact mode="text" icon={d.pinned ? 'pin-off' : 'pin'} onPress={() => toggle({ pinned: !d.pinned })}>{d.pinned ? 'Unpin' : 'Pin'}</Button> : null}
                {staff ? <Button compact mode="text" icon={d.locked ? 'lock-open' : 'lock'} onPress={() => toggle({ locked: !d.locked })}>{d.locked ? 'Reopen' : 'Close'}</Button> : null}
                {canDelete ? <Button compact mode="text" icon="delete-outline" textColor={c.error} onPress={remove}>Delete</Button> : null}
                {d.author_id !== user?.userId ? <Button compact mode="text" icon="flag-outline" textColor={c.textLight} onPress={() => setReporting({ type: 'message', id: d.id, what: 'conversation' })}>Report</Button> : null}
              </View>
            </View>
            {d.comments.length === 0 ? <Text style={styles.meta}>No comments yet. Be the first.</Text> : d.comments.map((cm) => <Thread key={cm.id} comment={cm} depth={0} />)}
          </>
        ) : null}
      </ScrollView>

      {d ? (d.locked && !staff ? (
        <View style={styles.composer}><Text style={styles.meta}>🔒 This conversation is closed, so no new comments can be added.</Text></View>
      ) : (
        <View style={styles.composer}>
          {replyTo ? (
            <View style={styles.row}>
              <Text style={[styles.meta, styles.flex]} numberOfLines={1}>Replying to {replyTo.author_name}</Text>
              <IconButton icon="close" size={16} onPress={() => setReplyTo(null)} accessibilityLabel="Stop replying" />
            </View>
          ) : null}
          {suggestions.length ? (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable key={s.id} onPress={() => { setText(insertMention(text, s.name)); setMentions((m) => [...m.filter((x) => x.id !== s.id), s]); setSuggestions([]); }} style={styles.suggestion} accessibilityRole="button">
                  <Text style={styles.body}>@{s.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.row}>
            <TextInput
              mode="outlined" multiline value={text} onChangeText={setText} style={styles.flex} dense
              placeholder={video ? 'Your thoughts. @ to mention, [12:34] for a moment in the video.' : 'Your thoughts. Type @ to mention someone.'}
              accessibilityLabel="Your comment"
            />
            <IconButton icon="send" mode="contained" containerColor={c.primary} iconColor={c.onPrimary} onPress={post} disabled={posting || !text.trim()} accessibilityLabel="Post comment" />
          </View>
        </View>
      )) : null}
      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </KeyboardAvoidingView>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  loading: { marginTop: 24 },
  error: { color: c.error },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 8 },
  cardTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  tag: { fontFamily: FONTS.displaySemi, fontSize: 13, letterSpacing: 1.5 },
  big: { color: c.text, fontFamily: FONTS.display, fontSize: 28, lineHeight: 30 },
  body: { color: c.text, fontSize: 15, lineHeight: 21 },
  time: { fontWeight: '800', textDecorationLine: 'underline' },
  meta: { color: c.textLight, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  flex: { flex: 1 },
  comment: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, gap: 4 },
  reply: { backgroundColor: c.surfaceRaised, marginTop: 8 },
  author: { color: c.text, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 18 },
  replyLink: { fontWeight: '800', fontSize: 13, paddingVertical: 6, alignSelf: 'flex-start' },
  actionLink: { color: c.textLight, fontWeight: '700', fontSize: 13, paddingVertical: 6 },
  composer: { borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10, gap: 4 },
  suggestions: { borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surfaceRaised },
  suggestion: { paddingVertical: 10, paddingHorizontal: 12, minHeight: 44 },
}));
