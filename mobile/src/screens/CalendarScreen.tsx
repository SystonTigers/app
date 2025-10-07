import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Card, Title, Paragraph, Button, Chip, List } from 'react-native-paper';
import { COLORS } from '../config';

// Mock events for now
const mockEvents = [
  {
    id: '1',
    date: '2025-11-10',
    type: 'match',
    title: 'vs Leicester Panthers',
    time: '14:00',
    location: 'Syston Recreation Ground',
    rsvp: null,
  },
  {
    id: '2',
    date: '2025-11-12',
    type: 'training',
    title: 'Training Session',
    time: '18:00',
    location: 'Syston Recreation Ground',
    rsvp: 'going',
  },
  {
    id: '3',
    date: '2025-11-15',
    type: 'social',
    title: 'Team Meal',
    time: '19:00',
    location: 'The Bull & Swan',
    rsvp: null,
  },
];

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Create marked dates for calendar
  const markedDates = mockEvents.reduce((acc: any, event) => {
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
    const event = mockEvents.find((e) => e.date === day.dateString);
    setSelectedEvent(event || null);
  };

  const handleRSVP = (eventId: string, status: 'going' | 'not_going' | 'maybe') => {
    // TODO: Call API
    console.log('RSVP:', eventId, status);
    if (selectedEvent?.id === eventId) {
      setSelectedEvent({ ...selectedEvent, rsvp: status });
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'match':
        return '⚽';
      case 'training':
        return '🏃';
      case 'social':
        return '🍻';
      default:
        return '📅';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Calendar */}
      <Calendar
        style={styles.calendar}
        theme={{
          backgroundColor: COLORS.surface,
          calendarBackground: COLORS.surface,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.secondary,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.textLight,
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
            <Title>
              {getEventIcon(selectedEvent.type)} {selectedEvent.title}
            </Title>
            <Paragraph style={styles.eventDetail}>📅 {selectedEvent.date}</Paragraph>
            <Paragraph style={styles.eventDetail}>🕐 {selectedEvent.time}</Paragraph>
            <Paragraph style={styles.eventDetail}>📍 {selectedEvent.location}</Paragraph>

            <View style={styles.rsvpButtons}>
              <Button
                mode={selectedEvent.rsvp === 'going' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'going')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'going' ? COLORS.success : undefined}
              >
                ✓ Going
              </Button>
              <Button
                mode={selectedEvent.rsvp === 'maybe' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'maybe')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'maybe' ? COLORS.warning : undefined}
              >
                ? Maybe
              </Button>
              <Button
                mode={selectedEvent.rsvp === 'not_going' ? 'contained' : 'outlined'}
                onPress={() => handleRSVP(selectedEvent.id, 'not_going')}
                style={styles.rsvpButton}
                buttonColor={selectedEvent.rsvp === 'not_going' ? COLORS.error : undefined}
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
      <View style={styles.upcomingSection}>
        <Title style={styles.sectionTitle}>Upcoming Events</Title>
        {mockEvents.map((event) => (
          <List.Item
            key={event.id}
            title={`${getEventIcon(event.type)} ${event.title}`}
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
              >
                {event.type}
              </Chip>
            )}
            right={(props) =>
              event.rsvp ? (
                <Chip {...props} style={styles.rsvpChip}>
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
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  calendar: {
    marginBottom: 16,
  },
  eventCard: {
    margin: 16,
    marginTop: 0,
  },
  eventDetail: {
    marginTop: 4,
    fontSize: 14,
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
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  eventListItem: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    borderRadius: 8,
  },
  typeChip: {
    marginTop: 8,
  },
  rsvpChip: {
    marginTop: 8,
    backgroundColor: COLORS.background,
  },
});
