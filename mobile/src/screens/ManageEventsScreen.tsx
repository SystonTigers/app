import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  FAB,
  Portal,
  Modal,
  Chip,
  Divider,
} from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { eventsApi } from '../services/api';

interface Event {
  id: string;
  title: string;
  type: 'match' | 'training' | 'social';
  date: string;
  time: string;
  location: string;
  description: string;
  rsvp_yes_count: number;
}



const eventTypes = [
  { value: 'match', label: 'Match', icon: 'soccer' },
  { value: 'training', label: 'Training', icon: 'run' },
  { value: 'social', label: 'Social', icon: 'party-popper' },
];

export default function ManageEventsScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'training' as 'match' | 'training' | 'social',
    date: '',
    time: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getEvents();
      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Error', 'Failed to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      type: 'training',
      date: '',
      time: '',
      location: '',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const eventData = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        description: formData.description,
      };

      if (editingEvent) {
        await eventsApi.updateEvent(editingEvent.id, eventData);
        Alert.alert('Success', 'Event updated successfully!');
      } else {
        await eventsApi.createEvent(eventData);
        Alert.alert('Success', 'Event created successfully!');
      }

      setShowModal(false);
      loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsApi.deleteEvent(id);
              Alert.alert('Success', 'Event deleted successfully!');
              loadEvents();
            } catch (error) {
              console.error('Failed to delete event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find((t) => t.value === type) || eventTypes[0];
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading events...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Paragraph style={styles.intro}>
          Create and manage team events, training, and social gatherings
        </Paragraph>

        <View style={styles.eventsContainer}>
          {events.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Events Yet</Title>
                <Paragraph style={styles.emptyText}>
                  Tap the + button to create your first event
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            events.map((event) => {
              const typeInfo = getEventTypeInfo(event.type);
              return (
                <Card key={event.id} style={styles.eventCard}>
                  <Card.Content>
                    <View style={styles.eventHeader}>
                      <Chip
                        icon={typeInfo.icon}
                        style={styles.typeChip}
                        textStyle={styles.chipText}
                      >
                        {typeInfo.label}
                      </Chip>
                      <Chip icon="check" style={styles.rsvpChip} textStyle={styles.rsvpChipText}>
                        {event.rsvp_yes_count} going
                      </Chip>
                    </View>

                    <Title style={styles.eventTitle}>{event.title}</Title>

                    <Divider style={styles.divider} />

                    <View style={styles.details}>
                      <Paragraph style={styles.detailText}>
                        📅 {event.date}
                      </Paragraph>
                      <Paragraph style={styles.detailText}>
                        🕐 {event.time}
                      </Paragraph>
                      <Paragraph style={styles.detailText}>
                        📍 {event.location}
                      </Paragraph>
                    </View>

                    {event.description && (
                      <Paragraph style={styles.description}>
                        {event.description}
                      </Paragraph>
                    )}

                    <View style={styles.actions}>
                      <Button
                        mode="outlined"
                        onPress={() => openEditModal(event)}
                        style={styles.actionButton}
                      >
                        Edit
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => handleDelete(event.id)}
                        style={styles.actionButton}
                        textColor={COLORS.error}
                      >
                        Delete
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        color={COLORS.onPrimary}
        accessibilityLabel="Add event"
      />

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </Title>

            <TextInput
              label="Event Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              style={styles.input}
              mode="outlined"
            />

            <View style={styles.chipGroup}>
              <Paragraph style={styles.label}>Event Type:</Paragraph>
              <View style={styles.chips}>
                {eventTypes.map((type) => (
                  <Chip
                    key={type.value}
                    selected={formData.type === type.value}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        type: type.value as any,
                      })
                    }
                    icon={formData.type === type.value ? undefined : type.icon}
                    style={[styles.selectChip, formData.type === type.value && styles.selectChipActive]}
                    selectedColor={COLORS.primary}
                  >
                    {type.label}
                  </Chip>
                ))}
              </View>
            </View>

            <TextInput
              label="Date (YYYY-MM-DD)"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              style={styles.input}
              mode="outlined"
              placeholder="2025-10-15"
            />

            <TextInput
              label="Time (HH:MM)"
              value={formData.time}
              onChangeText={(text) => setFormData({ ...formData, time: text })}
              style={styles.input}
              mode="outlined"
              placeholder="18:00"
            />

            <TextInput
              label="Location"
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text })
              }
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Description (optional)"
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.modalButton}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
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
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
  },
  scrollView: {
    flex: 1,
  },
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  eventsContainer: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeChip: {
    marginRight: 8,
    backgroundColor: COLORS.primarySoft,
  },
  rsvpChip: {
    backgroundColor: 'rgba(43,213,118,0.14)',
  },
  rsvpChipText: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  chipText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  chipGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectChipActive: {
    backgroundColor: COLORS.primarySoft,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}));
