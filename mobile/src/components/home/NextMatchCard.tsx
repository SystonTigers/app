import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Crest from './Crest';
import { FONTS } from '../../theme/brandFonts';
import { countdownLabel } from './homeUtils';

const OPPONENT = '#8E99A4';

/** The next fixture: both crests, a countdown and where/when, over a pitch-line pattern. */
export default function NextMatchCard({ clubName, color, badgeUrl, opponent, homeAway, date, dateText, time, venue, competition, onPress }: {
  clubName: string; color: string; badgeUrl?: string | null; opponent: string; homeAway: 'home' | 'away';
  date: string; dateText: string; time: string; venue: string | null; competition: string | null; onPress: () => void;
}) {
  const us = { name: clubName, color, badge: badgeUrl };
  const them = { name: opponent, color: OPPONENT, badge: null };
  const [home, away] = homeAway === 'away' ? [them, us] : [us, them];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Next match: ${home.name} v ${away.name}, ${dateText} ${time}`} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="nm" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.2} />
            <Stop offset="0.4" stopColor="#11151A" stopOpacity={1} />
            <Stop offset="1" stopColor="#0B0E12" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#nm)" />
        {/* halfway line and centre circle */}
        <Rect x={49.8} y={0} width={0.4} height={100} fill="#FFFFFF" fillOpacity={0.06} />
      </Svg>
      <View style={[styles.centreCircle, { borderColor: 'rgba(255,255,255,0.06)' }]} />

      <View style={styles.top}>
        <Text style={[styles.label, { color }]}>NEXT MATCH{competition ? ` · ${competition.toUpperCase()}` : ''}</Text>
        <View style={[styles.pill, { backgroundColor: color }]}>
          <Text style={styles.pillText}>{countdownLabel(date)}</Text>
        </View>
      </View>

      <View style={styles.teams}>
        <Team {...home} />
        <View style={styles.vsWrap}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.vs}>VS</Text>
        </View>
        <Team {...away} />
      </View>

      <View style={styles.details}>
        <Detail icon="calendar-blank" text={dateText} />
        <Detail icon="map-marker" text={venue || (homeAway === 'away' ? 'Away' : 'Home')} />
      </View>
    </Pressable>
  );
}

function Team({ name, color, badge }: { name: string; color: string; badge: string | null | undefined }) {
  return (
    <View style={styles.team}>
      <Crest name={name} color={color} badgeUrl={badge} size={58} />
      <Text style={styles.teamName} numberOfLines={2}>{name.toUpperCase()}</Text>
    </View>
  );
}

function Detail({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.detail}>
      <MaterialCommunityIcons name={icon as any} size={15} color="rgba(242,245,247,0.6)" />
      <Text style={styles.detailText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 4, borderRadius: 20, overflow: 'hidden', padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pressed: { opacity: 0.9 },
  centreCircle: { position: 'absolute', alignSelf: 'center', top: '30%', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 2, flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { color: '#06080B', fontFamily: FONTS.display, fontSize: 13, letterSpacing: 1 },
  teams: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 18, lineHeight: 19, textAlign: 'center' },
  vsWrap: { width: 78, alignItems: 'center', paddingTop: 8 },
  time: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 30, lineHeight: 32 },
  vs: { color: 'rgba(242,245,247,0.5)', fontFamily: FONTS.displaySemi, fontSize: 14, letterSpacing: 3 },
  details: { flexDirection: 'row', gap: 14, marginTop: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  detailText: { color: 'rgba(242,245,247,0.75)', fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
