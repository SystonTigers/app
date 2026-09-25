import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../config';
import { useClubName } from '../context/ClubContext';
import { apiErrorMessage, liveApi } from '../services/api';
import type { LiveMatchView } from '../utils/liveMatch';
import Card from '../components/ui/Card';
import ScoreHeader from '../components/live/ScoreHeader';
import LiveTimeline from '../components/live/LiveTimeline';

/**
 * Live Match (everyone): today's score and updates from the touchline,
 * refreshed every 15 seconds while a match is on.
 */
export default function LiveMatchWatchScreen() {
  const clubName = useClubName();
  const [matches, setMatches] = useState<LiveMatchView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await liveApi.list();
      setMatches(res.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load the live match. Pull down to try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      load();
      return () => setFocused(false);
    }, [load]),
  );

  const anyLive = matches.some((m) => m.status === 'live' || m.status === 'half_time');
  useEffect(() => {
    if (!focused || !anyLive) return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [focused, anyLive, load]);

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

      {matches.map((m) => (
        <Card key={m.fixture.id} inset style={styles.card}>
          <ScoreHeader match={m} clubName={clubName} />
          <LiveTimeline events={m.events} opponent={m.fixture.opponent} />
        </Card>
      ))}

      {!matches.length && !error ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="whistle" size={56} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No match on right now</Text>
          <Text style={styles.emptyText}>When the manager kicks off in Match Centre, the score and updates appear here.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16 },
  error: { color: COLORS.error, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { color: COLORS.textLight, fontSize: 14, textAlign: 'center' },
});
