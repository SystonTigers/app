import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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
import { COLORS } from '../config';

interface Event {
  id: string;
  title: string;
  type: 'match' | 'training' | 'social';
  date: string;
  time: string;
  location: string;
  description: string;
  rsvpCount: number;
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Training Session',
    type: 'training',
    date: '2025-10-12',
    time: '18:00',
    location: 'Syston Recreation Ground',
    description: 'Regular Thursday training. Bring your boots!',
    rsvpCount: 15,
  },
  {
    id: '2',
    title: 'End of Season BBQ',
    type: 'social',
    date: '2025-11-20',
    time: '14:00',
    location: 'Clubhouse',
    description: 'Celebrate the season with food, drinks, and awards!',
    rsvpCount: 32,
  },
];

const eventTypes = [
  { value: 'match', label: '⚽ Match', color: '#F44336' },
  { value: 'training', label: '🏃 Training', color: '#4CAF50' },
  { value: 'social', label: '🎉 Social', color: '#FF9800' },
];

export default function ManageEventsScreen() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
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

  const handleSave = () => {
    const newEvent: Event = {
      id: editingEvent?.id || Date.now().toString(),
      ...formData,
      rsvpCount: editingEvent?.rsvpCount || 0,
    };

    if (editingEvent) {
      setEvents(events.map((e) => (e.id === editingEvent.id ? newEvent : e)));
    } else {
      setEvents([...events, newEvent]);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find((t) => t.value === type) || eventTypes[0];
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Event Management</Title>
          <Paragraph style={styles.headerSubtitle}>
            Create and manage team events, training, and social gatherings
          </Paragraph>
        </View>

        <View style={styles.eventsContainer}>
          {events.map((event) => {
            const typeInfo = getEventTypeInfo(event.type);
            return (
              <Card key={event.id} style={styles.eventCard}>
                <Card.Content>
                  <View style={styles.eventHeader}>
                    <Chip
                      style={[
                        styles.typeChip,
                        { backgroundColor: typeInfo.color },
                      ]}
                      textStyle={styles.chipText}
                    >
                      {typeInfo.label}
                    </Chip>
                    <Chip style={styles.rsvpChip}>
                      ✓ {event.rsvpCount} going
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
          })}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openAddModal}
        color={COLORS.secondary}
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
                    style={styles.selectChip}
                    selectedColor={type.color}
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
                style={[
                  styles.modalButton,
                  { backgroundColor: COLORS.primary },
                ]}
                textColor={COLORS.secondary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  eventsContainer: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeChip: {
    marginRight: 8,
  },
  rsvpChip: {
    backgroundColor: COLORS.success,
  },
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
