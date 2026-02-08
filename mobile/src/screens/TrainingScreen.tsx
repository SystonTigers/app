import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, Portal, Modal as PaperModal, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import FeedCard from '../components/FeedCard';
import { haptics } from '../utils/haptics';

// Mock Data
const NEXT_SESSION = {
  date: 'Thursday, 15th Nov',
  time: '6:00 PM',
  location: 'Syston Community College',
  focus: 'Passing & Movement',
  drillCount: 4,
};

const DRILL_OF_WEEK = {
  name: 'Rondo 4v2',
  category: 'Possession',
  duration: '15-20 mins',
  difficulty: 'intermediate',
};

const RECENT_SESSIONS = [
  { id: '1', date: 'Nov 8', focus: 'Shooting Practice', attendees: 16 },
  { id: '2', date: 'Nov 1', focus: 'Defensive Shape', attendees: 14 },
];

// Performance Test Types
const TEST_TYPES = [
  { id: 'sprint_10m', name: '10m Sprint', unit: 'sec', icon: 'run-fast' },
  { id: 'sprint_20m', name: '20m Sprint', unit: 'sec', icon: 'run-fast' },
  { id: 'sprint_40m', name: '40m Sprint', unit: 'sec', icon: 'run-fast' },
  { id: 'sprint_parachute', name: '40m Parachute Sprint', unit: 'sec', icon: 'parachute' },
  { id: 'agility_illinois', name: 'Illinois Agility', unit: 'sec', icon: 'vector-polyline' },
  { id: 'agility_ttest', name: 'T-Test', unit: 'sec', icon: 'transit-connection-variant' },
  { id: 'beep_test', name: 'Beep Test', unit: 'level', icon: 'metronome' },
  { id: 'yoyo_test', name: 'Yo-Yo Test', unit: 'level', icon: 'repeat' },
];

// Mock Players
const PLAYERS = [
  { id: 'p1', name: 'Jake Smith' },
  { id: 'p2', name: 'Tom Reynolds' },
  { id: 'p3', name: 'Max Johnson' },
  { id: 'p4', name: 'Leo Williams' },
];

export default function TrainingScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;

  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Stopwatch state
  const [elapsedTime, setElapsedTime] = useState(0); // in milliseconds
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stopwatch effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 10);
      }, 10);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStartStop = () => {
    haptics.medium();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    haptics.light();
    setIsRunning(false);
    setElapsedTime(0);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const handleLogPerformance = () => {
    if (!selectedTestType || !selectedPlayer || elapsedTime === 0) {
      return;
    }

    haptics.success();
    const timeInSeconds = (elapsedTime / 1000).toFixed(2);

    // TODO: Save to backend
    console.log('Logging:', { selectedTestType, selectedPlayer, time: timeInSeconds });

    // Reset modal
    setShowPerformanceModal(false);
    setSelectedTestType(null);
    setSelectedPlayer(null);
    setElapsedTime(0);
    setIsRunning(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>

      {/* Hero: Next Session */}
      <FeedCard title="NEXT SESSION">
        <View style={styles.heroContent}>
          <View style={styles.heroRow}>
            <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
            <Text style={[styles.heroText, { color: colors.text }]}>{NEXT_SESSION.date}</Text>
          </View>
          <View style={styles.heroRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
            <Text style={[styles.heroText, { color: colors.text }]}>{NEXT_SESSION.time}</Text>
          </View>
          <View style={styles.heroRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
            <Text style={[styles.heroText, { color: colors.text }]}>{NEXT_SESSION.location}</Text>
          </View>
          <View style={[styles.focusBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.focusText, { color: colors.primary }]}>FOCUS: {NEXT_SESSION.focus.toUpperCase()}</Text>
          </View>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('DrillLibrary')}
            style={styles.heroButton}
          >
            VIEW SESSION PLAN ({NEXT_SESSION.drillCount} DRILLS)
          </Button>
        </View>
      </FeedCard>

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
          onPress={() => setShowPerformanceModal(true)}
        >
          <MaterialCommunityIcons name="timer" size={32} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Log Performance</Text>
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
        {RECENT_SESSIONS.map((session) => (
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

      {/* Performance Tracker Modal */}
      <Portal>
        <PaperModal
          visible={showPerformanceModal}
          onDismiss={() => setShowPerformanceModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>LOG PERFORMANCE</Text>
            <IconButton icon="close" onPress={() => setShowPerformanceModal(false)} iconColor={colors.text} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Select Test Type */}
            <Text style={[styles.modalLabel, { color: colors.text }]}>SELECT TEST</Text>
            <View style={styles.testGrid}>
              {TEST_TYPES.map((test) => (
                <TouchableOpacity
                  key={test.id}
                  style={[
                    styles.testChip,
                    {
                      backgroundColor: selectedTestType === test.id ? colors.primary : colors.background,
                      borderColor: colors.primary,
                    }
                  ]}
                  onPress={() => setSelectedTestType(test.id)}
                >
                  <MaterialCommunityIcons
                    name={test.icon as any}
                    size={16}
                    color={selectedTestType === test.id ? colors.background : colors.primary}
                  />
                  <Text style={[
                    styles.testChipText,
                    { color: selectedTestType === test.id ? colors.background : colors.text }
                  ]}>
                    {test.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Select Player */}
            <Text style={[styles.modalLabel, { color: colors.text }]}>SELECT PLAYER</Text>
            <View style={styles.playerGrid}>
              {PLAYERS.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerChip,
                    {
                      backgroundColor: selectedPlayer === player.id ? colors.primary : colors.background,
                      borderColor: colors.primary,
                    }
                  ]}
                  onPress={() => setSelectedPlayer(player.id)}
                >
                  <Text style={[
                    styles.playerChipText,
                    { color: selectedPlayer === player.id ? colors.background : colors.text }
                  ]}>
                    {player.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stopwatch */}
            <Text style={[styles.modalLabel, { color: colors.text }]}>STOPWATCH</Text>

            <View style={[styles.stopwatchContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.stopwatchDisplay, { color: colors.primary }]}>
                {formatTime(elapsedTime)}
              </Text>

              <View style={styles.stopwatchControls}>
                <Button
                  mode="contained"
                  onPress={handleStartStop}
                  style={[styles.controlButton, { backgroundColor: isRunning ? colors.error : colors.success }]}
                  icon={isRunning ? 'pause' : 'play'}
                >
                  {isRunning ? 'STOP' : 'START'}
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleReset}
                  style={styles.controlButton}
                  disabled={elapsedTime === 0}
                >
                  RESET
                </Button>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleLogPerformance}
              disabled={!selectedTestType || !selectedPlayer || elapsedTime === 0}
              style={styles.saveButton}
            >
              SAVE TIME ({(elapsedTime / 1000).toFixed(2)}s)
            </Button>
          </ScrollView>
        </PaperModal>
      </Portal>

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
  modal: {
    margin: 16,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 16,
    opacity: 0.7,
  },
  testGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  testChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  playerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stopwatchContainer: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  stopwatchDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  stopwatchControls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  controlButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});
