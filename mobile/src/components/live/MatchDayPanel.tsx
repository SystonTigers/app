import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { useMatchDay } from '../../context/MatchDayContext';
import type { MatchDayFixture } from '../../utils/matchDay';
import LiveStreamPlayer from './LiveStreamPlayer';
import { useNavigation } from '@react-navigation/native';

/**
 * On Live Match: the match's video (live, or to watch back) and "I'm at the
 * match", which pauses match alerts for this match.
 */
export default function MatchDayPanel({ fixture }: { fixture: MatchDayFixture }) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { setAttendance, clearAttendance } = useMatchDay();
  const navigation = useNavigation<any>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const atVenue = fixture.attendance?.atVenue === true;
  const over = fixture.matchStatus === 'full_time';

  const change = async (value: boolean) => {
    setSaving(true);
    setError('');
    try {
      await setAttendance(fixture.id, value, 'manual');
    } catch {
      setError("We couldn't save that. Check your signal and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {fixture.stream ? (
        <View style={styles.video}>
          <Text style={styles.label}>{fixture.stream.status === 'live' && !over ? '● Live video' : 'Watch the match back'}</Text>
          <LiveStreamPlayer stream={fixture.stream} />
          {over ? (
            <Pressable onPress={() => navigation.navigate('MatchHighlights', { fixtureId: fixture.id })} accessibilityRole="button">
              <Text style={styles.link}>▶ Watch the highlights</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!over ? (
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>I'm at the match</Text>
            <Text style={styles.help}>
              {atVenue ? 'Match alerts are paused while you watch.' : "You'll get goals and the score on your phone."}
              {fixture.attendance?.source === 'location' ? ' (Worked out by your phone.)' : ''}
            </Text>
            {fixture.attendance?.source === 'manual' ? (
              <Pressable onPress={() => clearAttendance(fixture.id).catch(() => undefined)} accessibilityRole="button">
                <Text style={styles.link}>Let my phone decide</Text>
              </Pressable>
            ) : null}
          </View>
          <Switch
            value={atVenue}
            onValueChange={change}
            disabled={saving}
            trackColor={{ true: COLORS.primary, false: '#3A3F44' }}
            accessibilityLabel="I'm at the match"
          />
        </View>
      ) : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  wrap: { marginBottom: 12 },
  video: { marginBottom: 12 },
  label: { color: COLORS.primary, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1 },
  rowTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  help: { color: COLORS.textLight, fontSize: 13, marginTop: 2 },
  link: { color: COLORS.primary, fontWeight: '700', marginTop: 6 },
  error: { color: COLORS.error, marginTop: 8 },
}));
