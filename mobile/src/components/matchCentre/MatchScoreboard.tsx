import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Backdrop from '../brand/Backdrop';
import Crest from '../home/Crest';
import { FONTS } from '../../theme/brandFonts';
import { scoreline, statusLabel, type LiveMatchView } from '../../utils/liveMatch';

const OPPONENT = '#8E99A4';
const LIVE_RED = '#FF3B4A';

/** The Match Centre scoreboard: crests, the score big, and the clock. */
export default function MatchScoreboard({ match, clubName, color, badgeUrl }: { match: LiveMatchView; clubName: string; color: string; badgeUrl?: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (match.status !== 'live') return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [match.status]);
  const s = scoreline(match, clubName);
  const usHome = match.fixture.homeAway === 'home';
  const live = match.status === 'live';
  return (
    <View style={styles.card} accessibilityRole="header" accessibilityLabel={`${s.home} ${s.homeScore}, ${s.away} ${s.awayScore}, ${statusLabel(match, now)}`}>
      <Backdrop color={color} width={400} height={200} glowY={0.5} intensity={0.8} />
      <View style={[styles.pill, live ? styles.pillLive : null]}>
        {live ? <View style={styles.dot} /> : null}
        <Text style={[styles.pillText, live ? styles.pillTextLive : null]}>{statusLabel(match, now).toUpperCase()}</Text>
      </View>
      <View style={styles.row}>
        <Side name={s.home} color={usHome ? color : OPPONENT} badge={usHome ? badgeUrl : null} />
        <Text style={styles.score}>{s.homeScore}<Text style={styles.dash}> – </Text>{s.awayScore}</Text>
        <Side name={s.away} color={usHome ? OPPONENT : color} badge={usHome ? null : badgeUrl} />
      </View>
    </View>
  );
}

function Side({ name, color, badge }: { name: string; color: string; badge: string | null | undefined }) {
  return (
    <View style={styles.side}>
      <Crest name={name} color={color} badgeUrl={badge} size={52} />
      <Text style={styles.name} numberOfLines={2}>{name.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', padding: 16, paddingTop: 14, backgroundColor: '#0E1216', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  pillLive: { backgroundColor: 'rgba(255,59,74,0.15)' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LIVE_RED },
  pillText: { color: 'rgba(242,245,247,0.8)', fontFamily: FONTS.display, fontSize: 15, letterSpacing: 1.5 },
  pillTextLive: { color: LIVE_RED },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12, width: '100%' },
  side: { flex: 1, alignItems: 'center', gap: 6 },
  name: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 16, lineHeight: 17, textAlign: 'center' },
  score: { color: '#FFFFFF', fontFamily: FONTS.display, fontSize: 58, lineHeight: 62, marginHorizontal: 6 },
  dash: { color: 'rgba(242,245,247,0.45)' },
});
