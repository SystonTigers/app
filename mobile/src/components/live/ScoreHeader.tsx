import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { scoreline, statusLabel, type LiveMatchView } from '../../utils/liveMatch';

/** Big scoreline with a clock that ticks while the match is live. */
export default function ScoreHeader({ match, clubName }: { match: LiveMatchView; clubName: string }) {
  const styles = useStyles();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (match.status !== 'live') return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [match.status]);

  const s = scoreline(match, clubName);
  const live = match.status === 'live';
  return (
    <View style={styles.wrap} accessibilityRole="header" accessibilityLabel={`${s.home} ${s.homeScore}, ${s.away} ${s.awayScore}, ${statusLabel(match, now)}`}>
      <View style={[styles.pill, live ? styles.pillLive : null]}>
        <Text style={[styles.pillText, live ? styles.pillTextLive : null]}>{live ? '● ' : ''}{statusLabel(match, now)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.team} numberOfLines={2}>{s.home}</Text>
        <Text style={styles.score}>{s.homeScore} – {s.awayScore}</Text>
        <Text style={[styles.team, styles.teamRight]} numberOfLines={2}>{s.away}</Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  wrap: { alignItems: 'center', paddingVertical: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.textLight, marginBottom: 12 },
  pillLive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  pillText: { color: COLORS.textLight, fontWeight: '700', fontSize: 13 },
  pillTextLive: { color: COLORS.primary },
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, color: COLORS.text, fontSize: 20, fontFamily: FONTS.display, letterSpacing: 0.5, textTransform: 'uppercase' },
  teamRight: { textAlign: 'right' },
  score: { color: COLORS.text, fontSize: 48, fontFamily: FONTS.display, marginHorizontal: 12, fontVariant: ['tabular-nums'] },
}));
