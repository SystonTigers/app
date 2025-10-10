import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Switch, List, Chip, TextInput, Button, Divider, SegmentedButtons } from 'react-native-paper';
import * as Location from 'expo-location';
import { COLORS } from '../config';

interface NotificationPreferences {
  masterToggle: boolean;
  teamsFollowed: string[];
  matchAlerts: {
    prematch24h: boolean;
    prematch3h: boolean;
    prematch1h: boolean;
    kickoff: boolean;
    halftime: boolean;
    fulltime: boolean;
    goals: boolean;
    cards: boolean;
    potm: boolean;
    clips: boolean;
  };
  locationAware: {
    enabled: boolean;
    notifyOnlyNearVenue: boolean;
    radius: number;
    etaReminder: boolean;
  };
  venuePreferences: {
    favorites: string[];
    muted: string[];
  };
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    allowUrgentBypass: boolean;
  };
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
}

const AVAILABLE_TEAMS = [
  'Syston Tigers U18',
  'Syston Tigers U16',
  'Syston Tigers U14',
  'Syston Tigers First Team',
  'Syston Tigers Reserves',
];

const RADIUS_OPTIONS = [
  { label: '1km', value: '1000' },
  { label: '5km', value: '5000' },
  { label: '10km', value: '10000' },
  { label: '20km', value: '20000' },
];

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44 7700 900123',
    language: 'en-GB',
    timezone: 'Europe/London',
  });

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    masterToggle: true,
    teamsFollowed: ['Syston Tigers U18'],
    matchAlerts: {
      prematch24h: true,
      prematch3h: true,
      prematch1h: true,
      kickoff: true,
      halftime: false,
      fulltime: true,
      goals: true,
      cards: true,
      potm: true,
      clips: true,
    },
    locationAware: {
      enabled: false,
      notifyOnlyNearVenue: false,
      radius: 5000,
      etaReminder: false,
    },
    venuePreferences: {
      favorites: [],
      muted: [],
    },
    channels: {
      inApp: true,
      email: true,
      sms: false,
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00',
      allowUrgentBypass: true,
    },
  });

  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const [expandedSection, setExpandedSection] = useState<string>('');

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status);
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);

    if (status === 'granted') {
      updatePreferences('locationAware', { ...preferences.locationAware, enabled: true });
    } else {
      Alert.alert(
        'Location Permission Required',
        'To use location-aware notifications, please enable location permissions in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  const updatePreferences = (section: keyof NotificationPreferences, value: any) => {
    setPreferences({ ...preferences, [section]: value });
  };

  const updateMatchAlert = (alert: keyof NotificationPreferences['matchAlerts'], value: boolean) => {
    setPreferences({
      ...preferences,
      matchAlerts: { ...preferences.matchAlerts, [alert]: value },
    });
  };

  const updateLocationAware = (setting: keyof NotificationPreferences['locationAware'], value: any) => {
    setPreferences({
      ...preferences,
      locationAware: { ...preferences.locationAware, [setting]: value },
    });
  };

  const updateChannel = (channel: keyof NotificationPreferences['channels'], value: boolean) => {
    setPreferences({
      ...preferences,
      channels: { ...preferences.channels, [channel]: value },
    });
  };

  const updateQuietHours = (setting: keyof NotificationPreferences['quietHours'], value: any) => {
    setPreferences({
      ...preferences,
      quietHours: { ...preferences.quietHours, [setting]: value },
    });
  };

  const toggleTeamFollow = (team: string) => {
    const followed = preferences.teamsFollowed.includes(team);
    const newTeams = followed
      ? preferences.teamsFollowed.filter(t => t !== team)
      : [...preferences.teamsFollowed, team];
    updatePreferences('teamsFollowed', newTeams);
  };

  const handleSave = () => {
    // TODO: Save to backend
    Alert.alert('Settings Saved', 'Your preferences have been updated successfully.', [{ text: 'OK' }]);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Settings</Title>
        <Paragraph style={styles.headerSubtitle}>Manage your preferences</Paragraph>
      </View>

      {/* Profile Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>👤 Profile</Title>
          <TextInput
            label="Name"
            value={profile.name}
            onChangeText={(text) => updateProfile('name', text)}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={profile.email}
            onChangeText={(text) => updateProfile('email', text)}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            label="Phone"
            value={profile.phone}
            onChangeText={(text) => updateProfile('phone', text)}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Notifications Master Toggle */}
      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title="Enable All Notifications"
            description="Master toggle for all notifications"
            left={props => <List.Icon {...props} icon="bell" color={COLORS.primary} />}
            right={() => (
              <Switch
                value={preferences.masterToggle}
                onValueChange={(value) => updatePreferences('masterToggle', value)}
                color={COLORS.primary}
              />
            )}
          />
        </Card.Content>
      </Card>

      {preferences.masterToggle && (
        <>
          {/* Teams Followed */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>⚽ Teams Followed</Title>
              <Paragraph style={styles.cardDescription}>
                Select which teams you want to receive notifications for
              </Paragraph>
              <View style={styles.teamsContainer}>
                {AVAILABLE_TEAMS.map((team) => (
                  <Chip
                    key={team}
                    selected={preferences.teamsFollowed.includes(team)}
                    onPress={() => toggleTeamFollow(team)}
                    style={[
                      styles.teamChip,
                      preferences.teamsFollowed.includes(team) && styles.teamChipSelected,
                    ]}
                    textStyle={[
                      styles.teamChipText,
                      preferences.teamsFollowed.includes(team) && styles.teamChipTextSelected,
                    ]}
                    selectedColor={COLORS.primary}
                  >
                    {team}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Match Alerts */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>🔔 Match Alerts</Title>
              <Paragraph style={styles.cardDescription}>
                Choose which match events trigger notifications
              </Paragraph>
              <Divider style={styles.divider} />

              <List.Section>
                <List.Subheader>Pre-Match Reminders</List.Subheader>
                <List.Item
                  title="24 hours before"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.prematch24h}
                      onValueChange={(value) => updateMatchAlert('prematch24h', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="3 hours before"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.prematch3h}
                      onValueChange={(value) => updateMatchAlert('prematch3h', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="1 hour before"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.prematch1h}
                      onValueChange={(value) => updateMatchAlert('prematch1h', value)}
                      color={COLORS.primary}
                    />
                  )}
                />

                <Divider style={styles.divider} />
                <List.Subheader>Match Events</List.Subheader>
                <List.Item
                  title="Kick-off"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.kickoff}
                      onValueChange={(value) => updateMatchAlert('kickoff', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="Half-time"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.halftime}
                      onValueChange={(value) => updateMatchAlert('halftime', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="Full-time"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.fulltime}
                      onValueChange={(value) => updateMatchAlert('fulltime', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="Goals scored"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.goals}
                      onValueChange={(value) => updateMatchAlert('goals', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="Cards issued"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.cards}
                      onValueChange={(value) => updateMatchAlert('cards', value)}
                      color={COLORS.primary}
                    />
                  )}
                />

                <Divider style={styles.divider} />
                <List.Subheader>Post-Match</List.Subheader>
                <List.Item
                  title="Player of the Match result"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.potm}
                      onValueChange={(value) => updateMatchAlert('potm', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
                <List.Item
                  title="Highlight clips posted"
                  right={() => (
                    <Switch
                      value={preferences.matchAlerts.clips}
                      onValueChange={(value) => updateMatchAlert('clips', value)}
                      color={COLORS.primary}
                    />
                  )}
                />
              </List.Section>
            </Card.Content>
          </Card>

          {/* Location-Aware Notifications */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>📍 Location-Aware Notifications</Title>
              <Paragraph style={styles.cardDescription}>
                Get notifications based on your proximity to match venues
              </Paragraph>
              <Divider style={styles.divider} />

              <List.Item
                title="Use my location"
                description={
                  locationPermission === 'granted'
                    ? 'Location permission granted'
                    : 'Requires location permission'
                }
                left={props => <List.Icon {...props} icon="map-marker" color={COLORS.primary} />}
                right={() => (
                  <Switch
                    value={preferences.locationAware.enabled}
                    onValueChange={(value) => {
                      if (value && locationPermission !== 'granted') {
                        requestLocationPermission();
                      } else {
                        updateLocationAware('enabled', value);
                      }
                    }}
                    color={COLORS.primary}
                  />
                )}
              />

              {preferences.locationAware.enabled && locationPermission === 'granted' && (
                <>
                  <List.Item
                    title="Notify only when near venue"
                    description="Only send match notifications when you're within the selected radius"
                    right={() => (
                      <Switch
                        value={preferences.locationAware.notifyOnlyNearVenue}
                        onValueChange={(value) => updateLocationAware('notifyOnlyNearVenue', value)}
                        color={COLORS.primary}
                      />
                    )}
                  />

                  <View style={styles.radiusContainer}>
                    <Paragraph style={styles.radiusLabel}>Notification Radius</Paragraph>
                    <SegmentedButtons
                      value={preferences.locationAware.radius.toString()}
                      onValueChange={(value) => updateLocationAware('radius', parseInt(value))}
                      buttons={RADIUS_OPTIONS}
                      style={styles.segmentedButtons}
                    />
                  </View>

                  <List.Item
                    title="ETA reminders while travelling"
                    description="Get notified with estimated arrival time when heading to venue"
                    right={() => (
                      <Switch
                        value={preferences.locationAware.etaReminder}
                        onValueChange={(value) => updateLocationAware('etaReminder', value)}
                        color={COLORS.primary}
                      />
                    )}
                  />
                </>
              )}
            </Card.Content>
          </Card>

          {/* Notification Channels */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>📱 Notification Channels</Title>
              <Paragraph style={styles.cardDescription}>
                Choose how you want to receive notifications
              </Paragraph>
              <Divider style={styles.divider} />

              <List.Item
                title="In-App Push Notifications"
                left={props => <List.Icon {...props} icon="bell-ring" />}
                right={() => (
                  <Switch
                    value={preferences.channels.inApp}
                    onValueChange={(value) => updateChannel('inApp', value)}
                    color={COLORS.primary}
                  />
                )}
              />
              <List.Item
                title="Email"
                left={props => <List.Icon {...props} icon="email" />}
                right={() => (
                  <Switch
                    value={preferences.channels.email}
                    onValueChange={(value) => updateChannel('email', value)}
                    color={COLORS.primary}
                  />
                )}
              />
              <List.Item
                title="SMS"
                description="Standard messaging rates may apply"
                left={props => <List.Icon {...props} icon="message-text" />}
                right={() => (
                  <Switch
                    value={preferences.channels.sms}
                    onValueChange={(value) => updateChannel('sms', value)}
                    color={COLORS.primary}
                  />
                )}
              />
            </Card.Content>
          </Card>

          {/* Quiet Hours */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>🌙 Quiet Hours</Title>
              <Paragraph style={styles.cardDescription}>
                Mute notifications during specific hours
              </Paragraph>
              <Divider style={styles.divider} />

              <List.Item
                title="Enable Quiet Hours"
                right={() => (
                  <Switch
                    value={preferences.quietHours.enabled}
                    onValueChange={(value) => updateQuietHours('enabled', value)}
                    color={COLORS.primary}
                  />
                )}
              />

              {preferences.quietHours.enabled && (
                <>
                  <View style={styles.timeContainer}>
                    <View style={styles.timeInputContainer}>
                      <Paragraph style={styles.timeLabel}>From</Paragraph>
                      <TextInput
                        value={preferences.quietHours.start}
                        onChangeText={(text) => updateQuietHours('start', text)}
                        mode="outlined"
                        placeholder="22:00"
                        style={styles.timeInput}
                      />
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Paragraph style={styles.timeLabel}>To</Paragraph>
                      <TextInput
                        value={preferences.quietHours.end}
                        onChangeText={(text) => updateQuietHours('end', text)}
                        mode="outlined"
                        placeholder="07:00"
                        style={styles.timeInput}
                      />
                    </View>
                  </View>

                  <List.Item
                    title="Allow urgent notifications"
                    description="Critical alerts (e.g., match cancellations) can bypass quiet hours"
                    right={() => (
                      <Switch
                        value={preferences.quietHours.allowUrgentBypass}
                        onValueChange={(value) => updateQuietHours('allowUrgentBypass', value)}
                        color={COLORS.primary}
                      />
                    )}
                  />
                </>
              )}
            </Card.Content>
          </Card>
        </>
      )}

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          buttonColor={COLORS.primary}
          textColor={COLORS.secondary}
          icon="content-save"
        >
          Save Settings
        </Button>
      </View>

      <View style={styles.footer}>
        <Paragraph style={styles.footerText}>
          Your notification preferences are stored securely and can be changed at any time.
        </Paragraph>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: COLORS.background,
  },
  input: {
    marginBottom: 12,
  },
  teamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  teamChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  teamChipSelected: {
    backgroundColor: COLORS.primary,
  },
  teamChipText: {
    color: COLORS.primary,
  },
  teamChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  radiusContainer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginVertical: 8,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    color: COLORS.text,
  },
  segmentedButtons: {
    marginBottom: 0,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  timeInput: {
    fontSize: 14,
  },
  saveContainer: {
    padding: 16,
  },
  saveButton: {
    paddingVertical: 8,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
