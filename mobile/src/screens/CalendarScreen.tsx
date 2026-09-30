import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { Card, Title, Paragraph, Button, Chip, List } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import SectionTitle from '../components/home/SectionTitle';
import { eventsApi } from '../services/api';

interface Event {
  id: string;
  date: string;
  type: string;
  title: string;
  time: string;
  location: string;
  rsvp?: string | null;
}

/** Dark ink for text on the light success/warning fills. */
const INK_TEXT = '#06080B';

export default function CalendarScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setError(null);
    try {
      const response = await eventsApi.getEvents(50);

      // Normalize the response
      let eventList: Event[] = [];
      if (response?.data) {
        eventList = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        eventList = response;
      }

      // Map backend events to our format
      const mappedEvents = eventList.map((event: any) => ({
        id: event.id || event.eventId || String(Math.random()),
        date: event.date || event.eventDate || new Date().toISOString().split('T')[0],
        type: event.type || event.eventType || 'event',
        title: event.title || event.name || 'Event',
        time: event.time || event.startTime || event.kickOffTime || 'TBC',
        location: event.location || event.venue || 'TBC',
        rsvp: event.rsvp || event.userRsvp || null,
      }));

      setEvents(mappedEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
  }, [loadEvents]);

  // Create marked dates for calendar
  const markedDates = events.reduce((acc: any, event) => {
    acc[event.date] = {
      marked: true,
      dotColor: event.type === 'match' ? COLORS.primary : event.type === 'training' ? COLORS.success : COLORS.accent,
    };
    return acc;
  }, {});

  // Add selection marker
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: COLORS.primary,
    };
  }

  const handleDatePress = (day: any) => {
    setSelectedDate(day.dateString);
    const event = events.find((e) => e.date === day.dateString);
    setSelectedEvent(event || null);
  };

  const handleRSVP = async (eventId: string, status: 'going' | 'not_going' | 'maybe') => {
    try {
      await eventsApi.rsvp(eventId, status);

      // Update local state
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, rsvp: status } : e
      ));

      if (selectedEvent?.id === eventId) {
        setSelectedEvent({ ...selectedEvent, rsvp: status });
      }

      Alert.alert('Success', 'RSVP updated');
    } catch (err) {
      console.error('RSVP failed:', err);
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    }
  };

  const getEventIcon = (type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    switch (type) {
      case 'match':
        return 'soccer';
      case 'training':
        return 'run';
      case 'social':
        return 'glass-mug-variant';
      default:
        return 'calendar';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading calendar...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
      }
    >
      {/* Error Message */}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Paragraph style={styles.errorText}>{error}</Paragraph>
            <Button mode="outlined" onPress={loadEvents} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Calendar */}
      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: COLORS.surface,
          calendarBackground: COLORS.surface,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.onPrimary,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: 'rgba(242,245,247,0.28)',
          monthTextColor: COLORS.text,
          textSectionTitleColor: COLORS.textLight,
          dotColor: COLORS.primary,
          arrowColor: COLORS.primary,
        }}
        markedDates={markedDates}
        onDayPress={handleDatePress}
      />

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card style={styles.eventCard}>
          <Card.Content>
            <View style={styles.eventTitleRow}>
              <MaterialCommunityIcons name={getEventIcon(selectedEvent.type)} size={22} color={COLORS.primary} />
              <Title style={styles.eventTitle}>{selectedEvent.title}</Title>
            </View>
            <View style={styles.eventDetailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={COLORS.textLight} />
              <Paragraph style={styles.eventDetail}>{selectedEvent.date}</Paragraph>
            </View>
            <View style={styles.eventDetailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textLight} />
              <Paragraph style={styles.eventDetail}>{selectedEvent.time}</Paragraph>
            </View>
            <View style={styles.eventDetailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.textLight} />
              <Paragraph style={styles.eventDetail}>{selectedEvent.location}</Paragraph>
            </View>

            <View style={styles.rsvpButtons}>
              <Button
                mode={selectedEvent.rsvp === 'going' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'going')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'going' ? COLORS.success : undefined}
                textColor={selectedEvent.rsvp === 'going' ? INK_TEXT : COLORS.text}
              >
                ✓ Going
              </Button>
              <Button
                mode={selectedEvent.rsvp === 'maybe' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'maybe')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'maybe' ? COLORS.warning : undefined}
                textColor={selectedEvent.rsvp === 'maybe' ? INK_TEXT : COLORS.text}
              >
                ? Maybe
              </Button>
              <Button
                mode={selectedEvent.rsvp === 'not_going' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'not_going')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'not_going' ? COLORS.error : undefined}
                textColor={selectedEvent.rsvp === 'not_going' ? '#FFFFFF' : COLORS.text}
              >
                ✗ Can't Go
              </Button>
            </View>

            <Button mode="outlined" style={styles.addToCalendarButton} onPress={() => console.log('Export .ics')}>
              Add to Calendar (.ics)
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Upcoming Events List */}
      <SectionTitle title="UPCOMING EVENTS" color={COLORS.primary} />
      <View style={styles.upcomingSection}>
        {events.length === 0 ? (
          <Paragraph style={styles.emptyText}>No upcoming events</Paragraph>
        ) : (
          events.map((event) => (
            <List.Item
              key={event.id}
              title={event.title}
              titleStyle={styles.eventListTitle}
              descriptionStyle={styles.eventListDescription}
              description={`${event.date} • ${event.time} • ${event.location}`}
              left={(props) => (
                <Chip
                  {...props}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        event.type === 'match'
                          ? COLORS.primary
                          : event.type === 'training'
                            ? COLORS.success
                            : COLORS.accent,
                    },
                  ]}
                  textStyle={{ color: event.type === 'training' ? INK_TEXT : COLORS.onPrimary, fontWeight: '700' }}
                >
                  {event.type}
                </Chip>
              )}
              right={(props) =>
                event.rsvp ? (
                  <Chip {...props} style={styles.rsvpChip} textStyle={styles.rsvpChipText}>
                    {event.rsvp === 'going' ? '✓ Going' : event.rsvp === 'maybe' ? '? Maybe' : '✗ Not Going'}
                  </Chip>
                ) : null
              }
              onPress={() => {
                setSelectedDate(event.date);
                setSelectedEvent(event);
              }}
              style={styles.eventListItem}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
  },
  errorCard: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255,0,85,0.14)',
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  emptyText: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  calendar: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  eventCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eventTitle: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 22,
    letterSpacing: 0.5,
    color: COLORS.text,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eventDetail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginVertical: 0,
  },
  rsvpButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 4,
  },
  rsvpButton: {
    flex: 1,
  },
  addToCalendarButton: {
    marginTop: 12,
  },
  upcomingSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventListItem: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventListTitle: {
    color: COLORS.text,
    fontWeight: '700',
  },
  eventListDescription: {
    color: COLORS.textLight,
  },
  typeChip: {
    marginTop: 8,
  },
  rsvpChip: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceRaised,
  },
  rsvpChipText: {
    color: COLORS.text,
  },
}));
