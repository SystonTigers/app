import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../theme/brandFonts';
import { activeSinBins, countdown, type LiveMatchView } from '../../utils/liveMatch';

/**
 * Match Centre prompts above the buttons: who is in the sin bin and how long
 * they have left (ticking every second, paused at half time), and, when the
 * match has run well past its length, a nudge to tap Full time.
 */
export default function MatchPrompts({ match, color, disabled, onFullTime }: {
  match: LiveMatchView;
  color: string;
  disabled?: boolean;
  onFullTime: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const bins = activeSinBins(match, now);
  const ticking = bins.length > 0 && match.status === 'live';
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  if (match.status === 'full_time' || match.status === 'scheduled') return null;
  const overdue = match.overdue || match.stale;
  if (!bins.length && !overdue) return null;

  return (
    <View style={styles.wrap}>
      {bins.map((b) => (
        <View key={b.id} style={styles.bin} accessibilityRole="timer" accessibilityLabel={`${b.playerName ?? 'Player'} in the sin bin, ${countdown(b.remainingMs)} left`}>
          <MaterialCommunityIcons name="timer-sand" size={22} color={YELLOW} />
          <Text style={styles.binName} numberOfLines={1}>{b.playerName ?? 'Player'}</Text>
          <Text style={styles.binLabel}>{match.status === 'half_time' ? 'PAUSED' : 'BACK IN'}</Text>
          <Text style={styles.binTime}>{countdown(b.remainingMs)}</Text>
        </View>
      ))}
      {overdue ? (
        <View style={styles.overdue} accessibilityRole="alert">
          <Text style={styles.overdueText}>
            {match.stale
              ? 'This match kicked off hours ago. Tap Full time to save the result.'
              : 'This match has run well past its time. Has it finished?'}
          </Text>
          <Pressable
            onPress={onFullTime}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Full time: save the result"
            style={({ pressed }) => [styles.overdueButton, { backgroundColor: color }, pressed || disabled ? styles.dim : null]}
          >
            <MaterialCommunityIcons name="flag-checkered" size={18} color="#06080B" />
            <Text style={styles.overdueButtonText}>FULL TIME</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const YELLOW = '#F5C400';

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 14 },
  bin: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(245,196,0,0.12)', borderWidth: 1, borderColor: 'rgba(245,196,0,0.4)' },
  binName: { flex: 1, color: '#F2F5F7', fontWeight: '800', fontSize: 15 },
  binLabel: { color: 'rgba(242,245,247,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  binTime: { color: YELLOW, fontFamily: FONTS.display, fontSize: 24, fontVariant: ['tabular-nums'], minWidth: 54, textAlign: 'right' },
  overdue: { padding: 14, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.45)', gap: 10 },
  overdueText: { color: '#F2F5F7', fontSize: 14, fontWeight: '700' },
  overdueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
  overdueButtonText: { color: '#06080B', fontFamily: FONTS.display, fontSize: 20, letterSpacing: 2 },
  dim: { opacity: 0.6 },
});
