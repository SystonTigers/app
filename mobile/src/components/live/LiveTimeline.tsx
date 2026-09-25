import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config';
import { canUndo, describeEvent, postStatusText, type LiveEvent, type SocialPost } from '../../utils/liveMatch';

const ICONS: Record<LiveEvent['type'], { name: string; color: string }> = {
  kick_off: { name: 'whistle', color: COLORS.textLight },
  half_time: { name: 'whistle', color: COLORS.textLight },
  second_half: { name: 'whistle', color: COLORS.textLight },
  full_time: { name: 'flag-checkered', color: COLORS.textLight },
  goal: { name: 'soccer', color: COLORS.primary },
  opp_goal: { name: 'soccer', color: COLORS.textLight },
  yellow: { name: 'card', color: '#F5C400' },
  red: { name: 'card', color: COLORS.error },
  sub: { name: 'swap-horizontal', color: COLORS.textLight },
  note: { name: 'message-text-outline', color: COLORS.textLight },
};

/**
 * Newest first. Staff views pass onUndo (Undo button), posts (what's been
 * posted for each update) and onShare (share the graphic, e.g. to TikTok).
 */
export default function LiveTimeline({ events, opponent, onUndo, busyId, posts, onShare }: {
  events: LiveEvent[];
  opponent: string;
  onUndo?: (event: LiveEvent) => void;
  busyId?: string | null;
  posts?: SocialPost[];
  onShare?: (post: SocialPost) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const counting = !!posts?.some((p) => p.status === 'pending' || p.status === 'posting');
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  if (!events.length) return <Text style={styles.empty}>Updates will appear here.</Text>;
  const postFor = new Map((posts ?? []).map((p) => [p.sourceId, p]));
  return (
    <View>
      {events.map((e) => {
        const icon = ICONS[e.type];
        const post = postFor.get(e.id);
        return (
          <View key={e.id}>
          <View style={styles.row}>
            <Text style={styles.minute}>{e.minute !== null ? `${e.minute}'` : ''}</Text>
            <MaterialCommunityIcons name={icon.name as any} size={20} color={icon.color} style={styles.icon} />
            <Text style={[styles.text, e.type === 'goal' ? styles.goal : null]}>{describeEvent(e, opponent)}</Text>
            {onUndo && canUndo(events, e) ? (
              <Pressable
                onPress={() => onUndo(e)}
                disabled={!!busyId}
                accessibilityRole="button"
                accessibilityLabel={`Undo: ${describeEvent(e, opponent)}`}
                style={styles.undo}
              >
                <Text style={styles.undoText}>{busyId === e.id ? '…' : 'Undo'}</Text>
              </Pressable>
            ) : null}
          </View>
          {post ? (
            <View style={styles.postRow}>
              <Text style={[styles.postText, post.status === 'failed' ? styles.postFailed : null]}>{postStatusText(post, now)}</Text>
              {onShare && post.status !== 'cancelled' ? (
                <Pressable onPress={() => onShare(post)} accessibilityRole="button" accessibilityLabel="Share this post to TikTok or WhatsApp" style={styles.undo}>
                  <Text style={styles.shareText}>Share</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: COLORS.textLight, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(192,192,192,0.25)' },
  minute: { width: 36, color: COLORS.textLight, fontWeight: '700', fontVariant: ['tabular-nums'] },
  icon: { marginRight: 10 },
  text: { flex: 1, color: COLORS.text, fontSize: 15 },
  goal: { fontWeight: '800', color: COLORS.primary },
  undo: { paddingHorizontal: 10, paddingVertical: 6 },
  undoText: { color: COLORS.textLight, fontWeight: '700', textDecorationLine: 'underline' },
  postRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 66, paddingBottom: 8, marginTop: -4 },
  postText: { flex: 1, color: COLORS.textLight, fontSize: 12 },
  postFailed: { color: COLORS.warning },
  shareText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
