import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, Text } from 'react-native';
import { Card, Paragraph, Switch, List, Chip, Button, Divider, TextInput, IconButton } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { autoPostsMatrixApi } from '../services/api';
import { FONTS } from '../theme/brandFonts';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

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

const POST_TYPE_INFO: Record<PostType, { label: string; description: string; icon: IconName }> = {
  COUNTDOWN_T3: { label: 'T-3 Days', description: 'Match countdown 3 days before', icon: 'calendar-clock' },
  COUNTDOWN_T2: { label: 'T-2 Days', description: 'Match countdown 2 days before', icon: 'calendar-clock' },
  COUNTDOWN_T1: { label: 'T-1 Day', description: 'Match countdown 1 day before', icon: 'calendar-clock' },
  MATCHDAY: { label: 'Match Day', description: 'Morning of match day', icon: 'soccer' },
  LIVE_UPDATE: { label: 'Live Updates', description: 'Goals, cards during match', icon: 'record-circle' },
  HALFTIME: { label: 'Half-Time', description: 'Score at half-time', icon: 'pause-circle' },
  FULLTIME: { label: 'Full-Time', description: 'Final score', icon: 'flag-checkered' },
  LEAGUE_FIXTURES: { label: 'League Fixtures', description: 'Batch of upcoming fixtures', icon: 'clipboard-list' },
  RESULTS_SUMMARY: { label: 'Results Summary', description: 'Weekend results recap', icon: 'chart-bar' },
  TABLE_UPDATE: { label: 'Table Update', description: 'League standings changed', icon: 'chart-line' },
  POSTPONEMENT: { label: 'Postponements', description: 'Match cancelled/moved', icon: 'alert' },
  BIRTHDAY: { label: 'Birthdays', description: 'Player birthdays', icon: 'cake-variant' },
  QUOTE: { label: 'Quotes', description: 'Motivational quotes', icon: 'format-quote-close' },
  MOTM_RESULT: { label: 'MOTM Result', description: 'Man of the Match announced', icon: 'trophy' },
  HIGHLIGHTS: { label: 'Highlights', description: 'Video clips posted', icon: 'movie-open' },
};

const CHANNEL_INFO: Record<ChannelKey, { label: string; icon: IconName }> = {
  app: { label: 'App Feed', icon: 'cellphone' },
  x: { label: 'X (Twitter)', icon: 'alpha-x' },
  instagram: { label: 'Instagram', icon: 'instagram' },
  facebook: { label: 'Facebook', icon: 'facebook' },
  tiktok: { label: 'TikTok', icon: 'music-note' },
};

export default function AutoPostsMatrixScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
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
        <Paragraph style={{ marginTop: 16, color: COLORS.textLight }}>Loading configuration...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>Control automated social media posts</Text>

      <ScrollView style={styles.scrollContainer}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Automation Control</Text>
            <Paragraph style={styles.infoText}>
              Configure which post types are automatically published to each social media channel. Settings apply club-wide with team overrides available.
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Inheritance Info */}
        <Card style={styles.inheritanceCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Inheritance Hierarchy</Text>
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
        <Text style={styles.sectionTitle}>Post Types</Text>
        {postTypes.map(postType => {
          const config = matrix[postType];
          const info = POST_TYPE_INFO[postType];
          const activeChannels = getActiveChannelsCount(config);

          return (
            <Card key={postType} style={styles.postTypeCard}>
              <List.Item
                title={info.label}
                description={info.description}
                titleStyle={styles.postTypeTitle}
                descriptionStyle={styles.postTypeDescription}
                left={(props) => <List.Icon {...props} icon={info.icon} color={COLORS.primary} />}
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
                          <MaterialCommunityIcons name={channelInfo.icon} size={22} color={COLORS.textLight} style={styles.channelIcon} />
                          <Paragraph style={styles.channelLabel}>{channelInfo.label}</Paragraph>
                        </View>
                        <Switch
                          value={config.channels[channel]}
                          onValueChange={() => toggleChannel(postType, channel)}
                          color={COLORS.primary}
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
            <Text style={styles.cardTitle}>Quick Toggles</Text>
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

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  inheritanceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inheritanceFlow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  inheritanceChip: {
    backgroundColor: COLORS.surfaceRaised,
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
    fontFamily: FONTS.display,
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  postTypeCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postTypeTitle: {
    color: COLORS.text,
    fontWeight: '600',
  },
  postTypeDescription: {
    color: COLORS.textLight,
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
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
  expandedContent: {
    paddingTop: 0,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: COLORS.border,
  },
  subsectionLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButton: {
    marginBottom: 8,
  },
  saveContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    paddingVertical: 8,
  },
}));
