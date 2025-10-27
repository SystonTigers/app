import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Switch,
  Divider,
  Chip,
} from 'react-native-paper';
import { COLORS } from '../config';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.workers.dev';
const API_VERSION = 'v1';

interface FixtureSettings {
  tenantId: string;
  teamName: string;
  faWebsiteUrl: string;
  // FA provides 4 different snippet URLs
  faSnippetFixturesUrl: string;
  faSnippetResultsUrl: string;
  faSnippetTableUrl: string;
  faSnippetTeamFixturesUrl: string;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  calendarId: string;
  calendarEnabled: boolean;
  gmailSearchQuery: string;
  gmailLabel: string;
  emailSyncEnabled: boolean;
  // Game format for match-day boost mode
  ageGroup: string;
  gameSize: string;
  halfLength: number;
  quarterLength?: number;
  matchDayBoostEnabled: boolean;
  typicalKickOffTime: string;
}

export default function FixtureSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FixtureSettings>({
    tenantId: 'default',
    teamName: 'Shepshed Dynamo Youth U16',
    faWebsiteUrl: '',
    faSnippetFixturesUrl: '',
    faSnippetResultsUrl: '',
    faSnippetTableUrl: '',
    faSnippetTeamFixturesUrl: '',
    syncEnabled: true,
    syncIntervalMinutes: 5,
    calendarId: '',
    calendarEnabled: false,
    gmailSearchQuery: 'from:@thefa.com subject:(fixture OR postponed)',
    gmailLabel: 'FA/Fixtures',
    emailSyncEnabled: true,
    ageGroup: 'U16',
    gameSize: '11v11',
    halfLength: 40,
    quarterLength: undefined,
    matchDayBoostEnabled: true,
    typicalKickOffTime: '14:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/${API_VERSION}/fixtures/settings?tenant_id=default`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({
            ...data.data,
            syncEnabled: Boolean(data.data.syncEnabled),
          });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.teamName.trim()) {
      Alert.alert('Error', 'Team name is required');
      return;
    }

    setSaving(true);

    try {
      // TODO: Replace with actual JWT token from auth context
      const token = 'YOUR_ADMIN_TOKEN';

      const response = await fetch(`${API_URL}/api/${API_VERSION}/fixtures/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        Alert.alert('Success', 'Settings saved successfully');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error?.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/${API_VERSION}/fixtures/upcoming`);

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Connection Test',
          `✅ Connected successfully!\n\nFound ${data.data?.length || 0} upcoming fixtures.`
        );
      } else {
        Alert.alert('Connection Test', '❌ Failed to connect to backend');
      }
    } catch (error) {
      Alert.alert('Connection Test', '❌ Failed to connect: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={styles.loadingText}>Loading settings...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>⚙️ Fixture Sync Settings</Title>
        <Paragraph style={styles.description}>
          Configure automatic fixture syncing from FA Full-Time. These settings control how
          fixtures are gathered and displayed in your app.
        </Paragraph>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Team Information</Title>

          <TextInput
            label="Team Name *"
            value={settings.teamName}
            onChangeText={(text) => setSettings({ ...settings, teamName: text })}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Shepshed Dynamo Youth U16"
          />

          <Paragraph style={styles.helperText}>
            This is the team name to match against FA fixture listings
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>FA Full-Time Integration</Title>

          <TextInput
            label="FA Website URL"
            value={settings.faWebsiteUrl}
            onChangeText={(text) => setSettings({ ...settings, faWebsiteUrl: text })}
            mode="outlined"
            style={styles.input}
            placeholder="https://fulltime-league.thefa.com/..."
            multiline
          />

          <Paragraph style={styles.helperText}>
            Your team's fixture page on FA Full-Time website
          </Paragraph>

          <Divider style={styles.sectionDivider} />

          <Paragraph style={styles.sectionLabel}>
            FA Snippet URLs (Optional) - FA provides different codes for each:
          </Paragraph>

          <TextInput
            label="Fixtures Snippet URL"
            value={settings.faSnippetFixturesUrl}
            onChangeText={(text) => setSettings({ ...settings, faSnippetFixturesUrl: text })}
            mode="outlined"
            style={styles.input}
            placeholder="https://..."
            multiline
          />

          <TextInput
            label="Results Snippet URL"
            value={settings.faSnippetResultsUrl}
            onChangeText={(text) => setSettings({ ...settings, faSnippetResultsUrl: text })}
            mode="outlined"
            style={styles.input}
            placeholder="https://..."
            multiline
          />

          <TextInput
            label="League Table Snippet URL"
            value={settings.faSnippetTableUrl}
            onChangeText={(text) => setSettings({ ...settings, faSnippetTableUrl: text })}
            mode="outlined"
            style={styles.input}
            placeholder="https://..."
            multiline
          />

          <TextInput
            label="Team Fixtures Snippet URL"
            value={settings.faSnippetTeamFixturesUrl}
            onChangeText={(text) => setSettings({ ...settings, faSnippetTeamFixturesUrl: text })}
            mode="outlined"
            style={styles.input}
            placeholder="https://..."
            multiline
          />

          <Paragraph style={styles.helperText}>
            FA provides separate embed/snippet codes for fixtures, results, league table, and team-specific data
          </Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Sync Settings</Title>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Paragraph style={styles.switchLabelText}>Enable Auto Sync</Paragraph>
              <Paragraph style={styles.switchLabelSubtext}>
                Automatically sync fixtures every {settings.syncIntervalMinutes} minutes
              </Paragraph>
            </View>
            <Switch
              value={settings.syncEnabled}
              onValueChange={(value) => setSettings({ ...settings, syncEnabled: value })}
              color={COLORS.primary}
            />
          </View>

          {settings.syncEnabled && (
            <Chip icon="check-circle" style={styles.statusChip}>
              Auto-sync is ACTIVE
            </Chip>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>📧 Email Integration</Title>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Paragraph style={styles.switchLabelText}>Sync from FA Emails</Paragraph>
              <Paragraph style={styles.switchLabelSubtext}>
                Parse fixture info from FA email notifications
              </Paragraph>
            </View>
            <Switch
              value={settings.emailSyncEnabled}
              onValueChange={(value) => setSettings({ ...settings, emailSyncEnabled: value })}
              color={COLORS.primary}
            />
          </View>

          {settings.emailSyncEnabled && (
            <>
              <TextInput
                label="Gmail Search Query"
                value={settings.gmailSearchQuery}
                onChangeText={(text) => setSettings({ ...settings, gmailSearchQuery: text })}
                mode="outlined"
                style={styles.input}
                placeholder="from:@thefa.com subject:fixture"
                multiline
              />

              <Paragraph style={styles.helperText}>
                Gmail query to find FA fixture emails (e.g., "from:@thefa.com subject:fixture")
              </Paragraph>

              <TextInput
                label="Gmail Label (Optional)"
                value={settings.gmailLabel}
                onChangeText={(text) => setSettings({ ...settings, gmailLabel: text })}
                mode="outlined"
                style={styles.input}
                placeholder="FA/Fixtures"
              />

              <Paragraph style={styles.helperText}>
                Organize emails with this label in Gmail
              </Paragraph>
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>📅 Google Calendar (Optional)</Title>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Paragraph style={styles.switchLabelText}>Sync to Google Calendar</Paragraph>
              <Paragraph style={styles.switchLabelSubtext}>
                Add fixtures to your Google Calendar automatically
              </Paragraph>
            </View>
            <Switch
              value={settings.calendarEnabled}
              onValueChange={(value) => setSettings({ ...settings, calendarEnabled: value })}
              color={COLORS.primary}
            />
          </View>

          {settings.calendarEnabled && (
            <>
              <TextInput
                label="Calendar ID"
                value={settings.calendarId}
                onChangeText={(text) => setSettings({ ...settings, calendarId: text })}
                mode="outlined"
                style={styles.input}
                placeholder="your-calendar@group.calendar.google.com"
              />

              <Paragraph style={styles.helperText}>
                Your Google Calendar ID (find in Calendar Settings)
              </Paragraph>
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>⚽ Game Format & Match Day Boost</Title>

          <Paragraph style={styles.description}>
            Configure your game format for accurate match-day result tracking.
            Boost mode will activate at the expected full-time based on your game length.
          </Paragraph>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Paragraph style={styles.switchLabelText}>Enable Match Day Boost</Paragraph>
              <Paragraph style={styles.switchLabelSubtext}>
                Sync every minute after expected full-time for instant results
              </Paragraph>
            </View>
            <Switch
              value={settings.matchDayBoostEnabled}
              onValueChange={(value) => setSettings({ ...settings, matchDayBoostEnabled: value })}
              color={COLORS.primary}
            />
          </View>

          {settings.matchDayBoostEnabled && (
            <>
              <Divider style={styles.sectionDivider} />

              <Paragraph style={styles.sectionLabel}>Age Group</Paragraph>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.ageGroup}
                  onValueChange={(value) => setSettings({ ...settings, ageGroup: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Under 6" value="U6" />
                  <Picker.Item label="Under 7" value="U7" />
                  <Picker.Item label="Under 8" value="U8" />
                  <Picker.Item label="Under 9" value="U9" />
                  <Picker.Item label="Under 10" value="U10" />
                  <Picker.Item label="Under 11" value="U11" />
                  <Picker.Item label="Under 12" value="U12" />
                  <Picker.Item label="Under 13" value="U13" />
                  <Picker.Item label="Under 14" value="U14" />
                  <Picker.Item label="Under 15" value="U15" />
                  <Picker.Item label="Under 16" value="U16" />
                  <Picker.Item label="Under 17" value="U17" />
                  <Picker.Item label="Under 18" value="U18" />
                </Picker>
              </View>

              <Paragraph style={styles.sectionLabel}>Game Size</Paragraph>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.gameSize}
                  onValueChange={(value) => setSettings({ ...settings, gameSize: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="5 vs 5" value="5v5" />
                  <Picker.Item label="7 vs 7" value="7v7" />
                  <Picker.Item label="9 vs 9" value="9v9" />
                  <Picker.Item label="11 vs 11" value="11v11" />
                </Picker>
              </View>

              <TextInput
                label="Minutes Per Half"
                value={String(settings.halfLength)}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  setSettings({ ...settings, halfLength: num });
                }}
                mode="outlined"
                style={styles.input}
                placeholder="40"
                keyboardType="number-pad"
              />

              <Paragraph style={styles.helperText}>
                Typical values: 5v5 = 20 mins, 7v7 = 25 mins, 9v9 = 30 mins, 11v11 = 40 mins
              </Paragraph>

              <TextInput
                label="Minutes Per Quarter (Optional)"
                value={settings.quarterLength ? String(settings.quarterLength) : ''}
                onChangeText={(text) => {
                  const num = text ? parseInt(text) : undefined;
                  setSettings({ ...settings, quarterLength: num });
                }}
                mode="outlined"
                style={styles.input}
                placeholder="Leave blank if playing halves"
                keyboardType="number-pad"
              />

              <Paragraph style={styles.helperText}>
                Only fill this if your age group plays 4 quarters instead of 2 halves
              </Paragraph>

              <TextInput
                label="Typical Kick-off Time"
                value={settings.typicalKickOffTime}
                onChangeText={(text) => setSettings({ ...settings, typicalKickOffTime: text })}
                mode="outlined"
                style={styles.input}
                placeholder="14:00"
              />

              <Paragraph style={styles.helperText}>
                Default kick-off time (used if not specified in fixture)
              </Paragraph>

              <Chip icon="information" style={styles.infoChip}>
                Boost mode will start {settings.halfLength * 2 + 10} mins after kick-off
              </Chip>
            </>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={testConnection}
          style={styles.button}
          icon="wifi"
        >
          Test Connection
        </Button>

        <Button
          mode="contained"
          onPress={saveSettings}
          loading={saving}
          disabled={saving}
          style={styles.button}
          icon="content-save"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </View>

      <Divider style={styles.divider} />

      <Card style={styles.infoCard}>
        <Card.Content>
          <Title style={styles.infoTitle}>📖 How It Works</Title>
          <Paragraph style={styles.infoParagraph}>
            1. Enter your team name and FA website URL
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            2. Enable auto-sync to automatically gather fixtures
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            3. Fixtures are synced from 3 sources:
            {'\n'}   • FA email notifications
            {'\n'}   • FA website scraping
            {'\n'}   • FA snippet/embed code
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            4. All fixtures appear automatically in the Fixtures screen
          </Paragraph>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  description: {
    color: COLORS.textLight,
    lineHeight: 22,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchLabelSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#eff6ff',
  },
  infoTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoParagraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 32,
  },
  sectionDivider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    color: COLORS.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  infoChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    marginTop: 8,
  },
});
