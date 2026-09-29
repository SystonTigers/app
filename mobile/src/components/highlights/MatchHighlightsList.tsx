import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config';
import { useClubName } from '../../context/ClubContext';
import { highlightsApi } from '../../services/api';
import { matchDate, type HighlightsMatch } from '../../utils/highlights';
import { fixtureTitle } from '../../utils/matchDay';

/** Recent matches with highlights from their video (top of the Highlights screen). */
export default function MatchHighlightsList() {
  const navigation = useNavigation<any>();
  const clubName = useClubName();
  const [matches, setMatches] = useState<HighlightsMatch[] | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    highlightsApi.list().then((res) => live && setMatches(res.data)).catch(() => live && setMatches([]));
    return () => { live = false; };
  }, []));

  if (!matches?.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Match highlights</Text>
      {matches.map((m) => (
        <Pressable key={m.fixtureId} onPress={() => navigation.navigate('MatchHighlights', { fixtureId: m.fixtureId })} accessibilityRole="button" style={styles.row}>
          <MaterialCommunityIcons name="play-circle" size={32} color={COLORS.primary} />
          <View style={styles.text}>
            <Text style={styles.title}>{fixtureTitle(m, clubName)}</Text>
            <Text style={styles.sub}>
              {[m.homeScore !== null && m.awayScore !== null ? `${m.homeScore}–${m.awayScore}` : null, matchDate(m.date), `${m.moments} moment${m.moments === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 16 },
  label: { color: COLORS.text, fontWeight: '800', textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#14181C', borderRadius: 12, padding: 12 },
  text: { flex: 1 },
  title: { color: COLORS.text, fontWeight: '800' },
  sub: { color: COLORS.textLight, fontSize: 13 },
});
