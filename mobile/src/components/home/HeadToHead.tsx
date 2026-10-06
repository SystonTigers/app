import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import type { HeadToHead as Record } from '../../services/api';
import { outcome, recordLine, shortMonthYear } from '../../utils/results';

/**
 * Under the next match on Home: how we've done against this opponent before
 * (record and the last few scores), or that it's the first meeting.
 */
export default function HeadToHead({ opponent, record, onPress }: { opponent: string; record: Record; onPress: () => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const badge = (o: 'W' | 'D' | 'L') => (o === 'W' ? c.success : o === 'D' ? c.warning : c.error);

  if (!record.played) {
    return (
      <View style={styles.card} accessibilityLabel={`First time playing ${opponent}`}>
        <Text style={styles.label}>HEAD TO HEAD</Text>
        <Text style={styles.first}>First time we&apos;ve played them. No previous results.</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Head to head against ${opponent}: ${recordLine(record)}, scored ${record.goalsFor}, conceded ${record.goalsAgainst}. Opens Results.`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.top}>
        <Text style={styles.label}>HEAD TO HEAD</Text>
        <Text style={styles.goals}>Scored {record.goalsFor} · Conceded {record.goalsAgainst}</Text>
      </View>
      <View style={styles.record}>
        {([['P', record.played], ['W', record.won], ['D', record.drawn], ['L', record.lost]] as const).map(([k, v]) => (
          <View key={k} style={styles.stat}>
            <Text style={styles.statValue}>{v}</Text>
            <Text style={styles.statLabel}>{k}</Text>
          </View>
        ))}
      </View>
      {record.meetings.slice(0, 3).map((m) => {
        const o = outcome(m.ourScore, m.theirScore);
        return (
          <View key={m.id} style={styles.meeting}>
            <View style={[styles.badge, { backgroundColor: badge(o) }]}>
              <Text style={styles.badgeText}>{o}</Text>
            </View>
            <Text style={styles.when} numberOfLines={1}>
              {shortMonthYear(m.date)}{m.homeAway ? ` · ${m.homeAway === 'home' ? 'Home' : 'Away'}` : ''}{m.competition && m.competition !== 'League' ? ` · ${m.competition}` : ''}
            </Text>
            <Text style={styles.score}>{m.ourScore}–{m.theirScore}</Text>
          </View>
        );
      })}
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 14, gap: 10 },
  pressed: { backgroundColor: c.surfaceRaised },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { color: c.primary, fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 2 },
  goals: { color: c.textLight, fontSize: 12, fontWeight: '700' },
  first: { color: c.textLight, lineHeight: 20 },
  record: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: c.text, fontFamily: FONTS.display, fontSize: 24, fontVariant: ['tabular-nums'] },
  statLabel: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  meeting: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  badge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#06080B', fontWeight: '900', fontSize: 13 },
  when: { color: c.text, flex: 1, fontSize: 14, fontWeight: '600' },
  score: { color: c.text, fontFamily: FONTS.display, fontSize: 20, fontVariant: ['tabular-nums'] },
}));
