import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Switch, List, Chip, Button, Divider, TextInput, IconButton } from 'react-native-paper';
import { COLORS } from '../config';
import { autoPostsMatrixApi } from '../services/api';

type ChannelKey = 'app' | 'x' | 'instagram' | 'facebook' | 'tiktok';
type PostType =
  | 'COUNTDOWN_T3'
  | 'COUNTDOWN_T2'
  | 'COUNTDOWN_T1'
  | 'MATCHDAY'
  | 'LIVE_UPDATE'
  | 'HALFTIME'
  | 'FULLTIME'
  | 'LEAGUE_FIXTURES'
  | 'RESULTS_SUMMARY'
  | 'TABLE_UPDATE'
  | 'POSTPONEMENT'
  | 'BIRTHDAY'
  | 'QUOTE'
  | 'MOTM_RESULT'
  | 'HIGHLIGHTS';

interface AutoPostConfig {
  channels: Record<ChannelKey, boolean>;
  scheduleTime?: string;
  sponsorOverlay: boolean;
}

type AutoPostsMatrix = Record<PostType, AutoPostConfig>;

const POST_TYPE_INFO: Record<PostType, { label: string; description: string; icon: string }> = {
  COUNTDOWN_T3: { label: 'T-3 Days', description: 'Match countdown 3 days before', icon: '📅' },
  COUNTDOWN_T2: { label: 'T-2 Days', description: 'Match countdown 2 days before', icon: '📅' },
  COUNTDOWN_T1: { label: 'T-1 Day', description: 'Match countdown 1 day before', icon: '📅' },
  MATCHDAY: { label: 'Match Day', description: 'Morning of match day', icon: '⚽' },
  LIVE_UPDATE: { label: 'Live Updates', description: 'Goals, cards during match', icon: '🔴' },
  HALFTIME: { label: 'Half-Time', description: 'Score at half-time', icon: '⏸️' },
  FULLTIME: { label: 'Full-Time', description: 'Final score', icon: '🏁' },
  LEAGUE_FIXTURES: { label: 'League Fixtures', description: 'Batch of upcoming fixtures', icon: '📋' },
  RESULTS_SUMMARY: { label: 'Results Summary', description: 'Weekend results recap', icon: '📊' },
  TABLE_UPDATE: { label: 'Table Update', description: 'League standings changed', icon: '📈' },
  POSTPONEMENT: { label: 'Postponements', description: 'Match cancelled/moved', icon: '⚠️' },
  BIRTHDAY: { label: 'Birthdays', description: 'Player birthdays', icon: '🎂' },
  QUOTE: { label: 'Quotes', description: 'Motivational quotes', icon: '💬' },
  MOTM_RESULT: { label: 'MOTM Result', description: 'Man of the Match announced', icon: '🏆' },
  HIGHLIGHTS: { label: 'Highlights', description: 'Video clips posted', icon: '🎬' },
};

const CHANNEL_INFO: Record<ChannelKey, { label: string; color: string; icon: string }> = {
  app: { label: 'App Feed', color: COLORS.primary, icon: '📱' },
  x: { label: 'X (Twitter)', color: '#000000', icon: '𝕏' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: '📷' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'f' },
  tiktok: { label: 'TikTok', color: '#000000', icon: '🎵' },
};

export default function AutoPostsMatrixScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrix, setMatrix] = useState<AutoPostsMatrix>({
    COUNTDOWN_T3: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '07:30',
      sponsorOverlay: true,
    },
    COUNTDOWN_T2: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '07:30',
      sponsorOverlay: true,
    },
    COUNTDOWN_T1: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '07:30',
      sponsorOverlay: true,
    },
    MATCHDAY: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: true },
      scheduleTime: '08:00',
      sponsorOverlay: true,
    },
    LIVE_UPDATE: {
      channels: { app: true, x: true, instagram: false, facebook: true, tiktok: false },
      sponsorOverlay: false,
    },
    HALFTIME: {
      channels: { app: true, x: true, instagram: false, facebook: true, tiktok: false },
      sponsorOverlay: false,
    },
    FULLTIME: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: true },
      sponsorOverlay: true,
    },
    LEAGUE_FIXTURES: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '18:00',
      sponsorOverlay: true,
    },
    RESULTS_SUMMARY: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '18:00',
      sponsorOverlay: true,
    },
    TABLE_UPDATE: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '19:00',
      sponsorOverlay: true,
    },
    POSTPONEMENT: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      sponsorOverlay: false,
    },
    BIRTHDAY: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      scheduleTime: '09:00',
      sponsorOverlay: false,
    },
    QUOTE: {
      channels: { app: true, x: false, instagram: true, facebook: false, tiktok: false },
      scheduleTime: '12:00',
      sponsorOverlay: false,
    },
    MOTM_RESULT: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: false },
      sponsorOverlay: true,
    },
    HIGHLIGHTS: {
      channels: { app: true, x: true, instagram: true, facebook: true, tiktok: true },
      sponsorOverlay: true,
    },
  });

  const [selectedPostType, setSelectedPostType] = useState<PostType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load matrix from backend on mount
  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const response = await autoPostsMatrixApi.getMatrix();
      if (response.success && response.data) {
        setMatrix(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load auto-posts matrix:', error);
      Alert.alert('Error', 'Failed to load auto-posts configuration. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (postType: PostType, channel: ChannelKey) => {
    setMatrix({
      ...matrix,
      [postType]: {
        ...matrix[postType],
        channels: {
          ...matrix[postType].channels,
          [channel]: !matrix[postType].channels[channel],
        },
      },
    });
    setHasChanges(true);
  };

  const toggleSponsorOverlay = (postType: PostType) => {
    setMatrix({
      ...matrix,
      [postType]: {
        ...matrix[postType],
        sponsorOverlay: !matrix[postType].sponsorOverlay,
      },
    });
    setHasChanges(true);
  };

  const setScheduleTime = (postType: PostType, time: string) => {
    setMatrix({
      ...matrix,
      [postType]: {
        ...matrix[postType],
        scheduleTime: time,
      },
    });
    setHasChanges(true);
  };

  const saveMatrix = async () => {
    try {
      setSaving(true);
      const response = await autoPostsMatrixApi.updateMatrix(matrix);
      if (response.success) {
        Alert.alert('Saved', 'Auto-posts matrix has been updated!', [
          {
            text: 'OK',
            onPress: () => setHasChanges(false)
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to save changes. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to save auto-posts matrix:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will restore all settings to club defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await autoPostsMatrixApi.resetMatrix();
              if (response.success && response.data) {
                setMatrix(response.data);
                Alert.alert('Reset', 'Settings restored to defaults.');
                setHasChanges(false);
              } else {
                Alert.alert('Error', 'Failed to reset settings. Please try again.');
              }
            } catch (error: any) {
              console.error('Failed to reset matrix:', error);
              Alert.alert('Error', 'Failed to reset settings. Please try again.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const getActiveChannelsCount = (config: AutoPostConfig): number => {
    return Object.values(config.channels).filter(Boolean).length;
  };

  const postTypes = Object.keys(POST_TYPE_INFO) as PostType[];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Paragraph style={{ marginTop: 16 }}>Loading configuration...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Auto-Posts Matrix</Title>
        <Paragraph style={styles.headerSubtitle}>Control automated social media posts</Paragraph>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.infoTitle}>🤖 Automation Control</Title>
            <Paragraph style={styles.infoText}>
              Configure which post types are automatically published to each social media channel. Settings apply club-wide with team overrides available.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Inheritance Info */}
        <Card style={styles.inheritanceCard}>
          <Card.Content>
            <Title style={styles.inheritanceTitle}>📊 Inheritance Hierarchy</Title>
            <View style={styles.inheritanceFlow}>
              <Chip style={styles.inheritanceChip}>1. Global Defaults</Chip>
              <Paragraph style={styles.inheritanceArrow}>↓</Paragraph>
              <Chip style={styles.inheritanceChip}>2. Team Overrides</Chip>
              <Paragraph style={styles.inheritanceArrow}>↓</Paragraph>
              <Chip style={styles.inheritanceChip}>3. One-off Overrides</Chip>
            </View>
            <Paragraph style={styles.inheritanceText}>
              You're editing global defaults. Teams can override these settings.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Post Types List */}
        <Title style={styles.sectionTitle}>Post Types</Title>
        {postTypes.map(postType => {
          const config = matrix[postType];
          const info = POST_TYPE_INFO[postType];
          const activeChannels = getActiveChannelsCount(config);

          return (
            <Card key={postType} style={styles.postTypeCard}>
              <List.Item
                title={`${info.icon} ${info.label}`}
                description={info.description}
                right={() => (
                  <View style={styles.postTypeRight}>
                    <Chip style={styles.channelsChip} textStyle={styles.channelsChipText}>
                      {activeChannels}/5 channels
                    </Chip>
                    <IconButton
                      icon={selectedPostType === postType ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      onPress={() => setSelectedPostType(selectedPostType === postType ? null : postType)}
                    />
                  </View>
                )}
                onPress={() => setSelectedPostType(selectedPostType === postType ? null : postType)}
              />

              {selectedPostType === postType && (
                <Card.Content style={styles.expandedContent}>
                  <Divider style={styles.divider} />

                  {/* Channels */}
                  <Paragraph style={styles.subsectionLabel}>Channels</Paragraph>
                  {(Object.keys(CHANNEL_INFO) as ChannelKey[]).map(channel => {
                    const channelInfo = CHANNEL_INFO[channel];
                    return (
                      <View key={channel} style={styles.channelRow}>
                        <View style={styles.channelInfo}>
                          <Paragraph style={styles.channelIcon}>{channelInfo.icon}</Paragraph>
                          <Paragraph style={styles.channelLabel}>{channelInfo.label}</Paragraph>
                        </View>
                        <Switch
                          value={config.channels[channel]}
                          onValueChange={() => toggleChannel(postType, channel)}
                          color={channelInfo.color}
                        />
                      </View>
                    );
                  })}

                  {/* Schedule Time */}
                  {config.scheduleTime !== undefined && (
                    <>
                      <Paragraph style={styles.subsectionLabel}>Scheduled Time (Local)</Paragraph>
                      <TextInput
                        value={config.scheduleTime}
                        onChangeText={(text) => setScheduleTime(postType, text)}
                        mode="outlined"
                        placeholder="HH:MM"
                        style={styles.timeInput}
                      />
                    </>
                  )}

                  {/* Sponsor Overlay */}
                  <View style={styles.sponsorRow}>
                    <Paragraph style={styles.sponsorLabel}>Sponsor Overlay</Paragraph>
                    <Switch
                      value={config.sponsorOverlay}
                      onValueChange={() => toggleSponsorOverlay(postType)}
                      color={COLORS.primary}
                    />
                  </View>
                </Card.Content>
              )}
            </Card>
          );
        })}

        {/* Quick Toggles */}
        <Card style={styles.quickCard}>
          <Card.Content>
            <Title style={styles.quickTitle}>⚡ Quick Toggles</Title>
            <Button
              mode="outlined"
              onPress={() => {
                // Enable all channels for all post types
                const newMatrix = { ...matrix };
                postTypes.forEach(pt => {
                  (Object.keys(CHANNEL_INFO) as ChannelKey[]).forEach(ch => {
                    newMatrix[pt].channels[ch] = true;
                  });
                });
                setMatrix(newMatrix);
                setHasChanges(true);
              }}
              style={styles.quickButton}
            >
              Enable All Channels
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                // Disable all social channels (keep app only)
                const newMatrix = { ...matrix };
                postTypes.forEach(pt => {
                  newMatrix[pt].channels = {
                    app: true,
                    x: false,
                    instagram: false,
                    facebook: false,
                    tiktok: false,
                  };
                });
                setMatrix(newMatrix);
                setHasChanges(true);
              }}
              style={styles.quickButton}
            >
              App Feed Only
            </Button>
            <Button
              mode="outlined"
              onPress={resetToDefaults}
              style={styles.quickButton}
              textColor={COLORS.error}
            >
              Reset to Defaults
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveContainer}>
          <Button
            mode="contained"
            icon="content-save"
            onPress={saveMatrix}
            style={styles.saveButton}
            buttonColor={COLORS.primary}
            textColor={COLORS.secondary}
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </View>
      )}
    </View>
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  inheritanceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  inheritanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inheritanceFlow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  inheritanceChip: {
    backgroundColor: COLORS.background,
    marginVertical: 4,
  },
  inheritanceArrow: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  inheritanceText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  postTypeCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  postTypeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelsChip: {
    backgroundColor: COLORS.primary,
    height: 28,
  },
  channelsChipText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  expandedContent: {
    paddingTop: 0,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  channelLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeInput: {
    marginBottom: 16,
  },
  sponsorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sponsorLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  quickCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickButton: {
    marginBottom: 8,
  },
  saveContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  saveButton: {
    paddingVertical: 8,
  },
});
