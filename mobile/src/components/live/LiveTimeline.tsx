import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors, type BrandColors } from '../../theme/brand';
import { canUndo, describeEvent, describeEventOnSide, eventSide, postStatusText, type LiveEvent, type SocialPost } from '../../utils/liveMatch';

type Tone = 'muted' | 'accent' | 'yellow' | 'red';

const ICONS: Record<LiveEvent['type'], { name: string; tone: Tone }> = {
  kick_off: { name: 'whistle', tone: 'muted' },
  half_time: { name: 'whistle', tone: 'muted' },
  second_half: { name: 'whistle', tone: 'muted' },
  full_time: { name: 'flag-checkered', tone: 'muted' },
  goal: { name: 'soccer', tone: 'accent' },
  opp_goal: { name: 'soccer', tone: 'muted' },
  yellow: { name: 'card', tone: 'yellow' },
  red: { name: 'card', tone: 'red' },
  sub: { name: 'swap-horizontal', tone: 'muted' },
  note: { name: 'message-text-outline', tone: 'muted' },
  chance: { name: 'target', tone: 'muted' },
  save: { name: 'hand-back-left', tone: 'muted' },
  skill: { name: 'star-outline', tone: 'accent' },
  opp_yellow: { name: 'card', tone: 'yellow' },
  opp_red: { name: 'card', tone: 'red' },
};

function toneColor(tone: Tone, c: BrandColors): string {
  switch (tone) {
    case 'accent': return c.primary;
    case 'yellow': return '#F5C400';
    case 'red': return c.error;
    default: return c.textLight;
  }
}

/**
 * Newest first. Staff views pass onUndo (Undo button), posts (what's been
 * posted for each update) and onShare (share the graphic, e.g. to TikTok).
 * Passing usIsHome shows each update under its team, like the score above:
 * home team's on the left, away team's on the right, whistles in the middle.
 */
export default function LiveTimeline({ events, opponent, onUndo, busyId, posts, onShare, usIsHome }: {
  events: LiveEvent[];
  opponent: string;
  usIsHome?: boolean;
  onUndo?: (event: LiveEvent) => void;
  busyId?: string | null;
  posts?: SocialPost[];
  onShare?: (post: SocialPost) => void;
}) {
  const c = useBrandColors();
  const accent = c.primary;
  const styles = useStyles();
  const [now, setNow] = useState(Date.now());
  const counting = !!posts?.some((p) => p.status === 'pending' || p.status === 'posting');
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  if (!events.length) return <Text style={styles.empty}>Updates will appear here.</Text>;
  if (usIsHome !== undefined) return <SideBySide events={events} opponent={opponent} usIsHome={usIsHome} />;
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
            <MaterialCommunityIcons name={icon.name as any} size={20} color={toneColor(icon.tone, c)} style={styles.icon} />
            <Text style={[styles.text, e.type === 'goal' ? [styles.goal, { color: accent }] : null]}>{describeEvent(e, opponent)}</Text>
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

/** Each update under its team's name: home on the left, away on the right, minute in the middle. */
const SHOWN_AT_FIRST = 5;

function SideBySide({ events, opponent, usIsHome }: { events: LiveEvent[]; opponent: string; usIsHome: boolean }) {
  const c = useBrandColors();
  const accent = c.primary;
  const styles = useStyles();
  // Only the latest few until asked, so a high-scoring match doesn't push the live video off the screen
  const [all, setAll] = useState(false);
  const hidden = events.length - SHOWN_AT_FIRST;
  const shown = all || hidden <= 1 ? events : events.slice(0, SHOWN_AT_FIRST);
  return (
    <View>
      {shown.map((e) => {
        const icon = ICONS[e.type];
        const side = eventSide(e);
        const minute = e.minute !== null ? `${e.minute}'` : '';
        if (side === 'middle') {
          return (
            <View key={e.id} style={[styles.row, styles.middleRow]}>
              <MaterialCommunityIcons name={icon.name as any} size={16} color={toneColor(icon.tone, c)} />
              <Text style={styles.middleText}>{minute ? `${minute} ` : ''}{describeEvent(e, opponent)}</Text>
            </View>
          );
        }
        const left = (side === 'us') === usIsHome;
        const content = (
          <View style={[styles.sideContent, left ? styles.sideLeft : styles.sideRight]}>
            <MaterialCommunityIcons name={icon.name as any} size={18} color={toneColor(icon.tone, c)} />
            <Text style={[styles.sideText, left ? styles.textRight : null, e.type === 'goal' ? [styles.goal, { color: accent }] : e.type === 'opp_goal' ? styles.oppGoal : null]}>
              {describeEventOnSide(e, opponent)}
            </Text>
          </View>
        );
        return (
          <View key={e.id} style={styles.row} accessibilityLabel={`${minute} ${describeEvent(e, opponent)}`}>
            <View style={styles.half}>{left ? content : null}</View>
            <Text style={styles.sideMinute}>{minute}</Text>
            <View style={styles.half}>{left ? null : content}</View>
          </View>
        );
      })}
      {hidden > 1 ? (
        <Pressable onPress={() => setAll((a) => !a)} accessibilityRole="button" style={styles.more}>
          <Text style={styles.moreText}>{all ? 'Show fewer' : `Show all ${events.length} updates`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  empty: { color: COLORS.textLight, textAlign: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  minute: { width: 36, color: COLORS.textLight, fontWeight: '700', fontVariant: ['tabular-nums'] },
  icon: { marginRight: 10 },
  text: { flex: 1, color: COLORS.text, fontSize: 15 },
  goal: { fontWeight: '800' },
  undo: { paddingHorizontal: 10, paddingVertical: 6 },
  undoText: { color: COLORS.textLight, fontWeight: '700', textDecorationLine: 'underline' },
  postRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 66, paddingBottom: 8, marginTop: -4 },
  postText: { flex: 1, color: COLORS.textLight, fontSize: 12 },
  postFailed: { color: COLORS.warning },
  shareText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  middleRow: { justifyContent: 'center', gap: 6 },
  middleText: { color: COLORS.textLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  half: { flex: 1 },
  sideMinute: { width: 44, textAlign: 'center', color: COLORS.textLight, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sideContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideLeft: { flexDirection: 'row-reverse' },
  sideRight: {},
  sideText: { flexShrink: 1, color: COLORS.text, fontSize: 14 },
  textRight: { textAlign: 'right' },
  oppGoal: { fontWeight: '800' },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { color: COLORS.primary, fontWeight: '800' },
}));
