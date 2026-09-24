import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import FeedCard from '../components/FeedCard';
import { trainingApi } from '../services/api';


// Static config (not mock data)
const DRILL_OF_WEEK = {
  name: 'Rondo 4v2',
  category: 'Possession',
  duration: '15-20 mins',
  difficulty: 'intermediate',
};

export default function TrainingScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;

  // Data state (replaces mock data)
  const [nextSession, setNextSession] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Load real data on mount
  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const sessionsResult = await trainingApi.listSessions().catch(() => ({ data: [] }));
      const sessions = sessionsResult?.data || [];
      if (sessions.length > 0) {
        const upcoming = sessions.find((s: any) => new Date(s.date || s.scheduledAt) > new Date());
        if (upcoming) {
          const d = new Date(upcoming.date || upcoming.scheduledAt);
          setNextSession({
            date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
            time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            location: upcoming.location || upcoming.venue || 'TBC',
            focus: upcoming.focus || upcoming.title || 'General',
            drillCount: upcoming.drillCount || 0,
          });
        }
        setRecentSessions(sessions.filter((s: any) => new Date(s.date || s.scheduledAt) <= new Date()).slice(0, 5).map((s: any) => ({
          id: s.id,
          date: new Date(s.date || s.scheduledAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
          focus: s.focus || s.title || 'Session',
          attendees: s.attendees || s.playerCount || 0,
        })));
      }
    } catch (err) {
      console.error('Error loading training data:', err);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>

      {/* Hero: Next Session */}
      {nextSession ? (
        <FeedCard title="NEXT SESSION">
          <View style={styles.heroContent}>
            <View style={styles.heroRow}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.heroText, { color: colors.text }]}>{nextSession.date}</Text>
            </View>
            <View style={styles.heroRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
              <Text style={[styles.heroText, { color: colors.text }]}>{nextSession.time}</Text>
            </View>
            <View style={styles.heroRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              <Text style={[styles.heroText, { color: colors.text }]}>{nextSession.location}</Text>
            </View>
            <View style={[styles.focusBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
              <Text style={[styles.focusText, { color: colors.primary }]}>FOCUS: {nextSession.focus.toUpperCase()}</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('DrillLibrary')}
              style={styles.heroButton}
            >
              VIEW SESSION PLAN ({nextSession.drillCount} DRILLS)
            </Button>
          </View>
        </FeedCard>
      ) : null}

      {/* Quick Actions Grid */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>QUICK ACTIONS</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
          onPress={() => navigation.navigate('DrillLibrary')}
        >
          <MaterialCommunityIcons name="book-open-variant" size={32} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Drill Library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
          onPress={() => console.log('Plan Session')}
        >
          <MaterialCommunityIcons name="clipboard-edit" size={32} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Plan Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}
          onPress={() => console.log('Attendance')}
        >
          <MaterialCommunityIcons name="account-check" size={32} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* Drill of the Week */}
      <FeedCard
        title="DRILL OF THE WEEK"
        headerRight={<MaterialCommunityIcons name="star" size={20} color={colors.primary} />}
        onPress={() => navigation.navigate('DrillLibrary')}
      >
        <View style={styles.drillContent}>
          <Text style={[styles.drillName, { color: colors.text }]}>{DRILL_OF_WEEK.name}</Text>
          <Text style={[styles.drillCategory, { color: colors.textSecondary }]}>{DRILL_OF_WEEK.category}</Text>
          <View style={styles.drillMeta}>
            <Chip style={{ backgroundColor: colors.warning }}>{DRILL_OF_WEEK.difficulty.toUpperCase()}</Chip>
            <Text style={[styles.drillDuration, { color: colors.textSecondary }]}>{DRILL_OF_WEEK.duration}</Text>
          </View>
        </View>
      </FeedCard>

      {/* Recent Sessions */}
      <FeedCard title="RECENT SESSIONS">
        {recentSessions.map((session: any) => (
          <View key={session.id} style={[styles.sessionRow, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.sessionFocus, { color: colors.text }]}>{session.focus}</Text>
              <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>{session.date}</Text>
            </View>
            <View style={styles.attendeeBadge}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.primary} />
              <Text style={[styles.attendeeCount, { color: colors.primary }]}>{session.attendees}</Text>
            </View>
          </View>
        ))}
      </FeedCard>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  heroContent: {
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    fontWeight: '500',
  },
  focusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  focusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
    opacity: 0.7,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1.3,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  drillContent: {
    padding: 16,
  },
  drillName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  drillCategory: {
    fontSize: 12,
    marginBottom: 12,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drillDuration: {
    fontSize: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sessionFocus: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
