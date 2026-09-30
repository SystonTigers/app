import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Chip,
  IconButton,
  Divider,
} from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { feedApi } from '../services/api';
import { useClubName } from '../context/ClubContext';
import * as ImagePicker from 'expo-image-picker';

const socialChannels = [
  { id: 'feed', name: 'App Feed', icon: '📱', color: '#FFD700' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', color: '#000000' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2' },
];

export default function CreatePostScreen({ navigation }: any) {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const clubName = useClubName();
  const [content, setContent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['feed']);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [charCount, setCharCount] = useState(0);

  const toggleChannel = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      setSelectedChannels(selectedChannels.filter((id) => id !== channelId));
    } else {
      setSelectedChannels([...selectedChannels, channelId]);
    }
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setCharCount(text.length);
  };

  const handleAddMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newUrls = result.assets.map(asset => asset.uri);
        setMediaUrls([...mediaUrls, ...newUrls]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    if (selectedChannels.length === 0) {
      Alert.alert('Error', 'Please select at least one channel');
      return;
    }

    try {
      await feedApi.createPost(content, selectedChannels, mediaUrls);
      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const getChannelLimit = () => {
    if (selectedChannels.includes('x')) return 280;
    if (selectedChannels.includes('instagram')) return 2200;
    return 1000;
  };

  // The app feed is the club's own channel, so it wears the club colour; X's black would vanish on the dark card
  const channelFill = (id: string, color: string) =>
    id === 'feed' ? COLORS.primary : id === 'x' ? COLORS.surfaceRaised : color;
  const channelInk = (id: string) => (id === 'feed' ? COLORS.onPrimary : '#FFFFFF');

  const charLimit = getChannelLimit();
  const isOverLimit = charCount > charLimit;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerSubtitle}>
        Share updates with your team and fans
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Paragraph style={styles.label}>Select Channels:</Paragraph>
          <View style={styles.channelsContainer}>
            {socialChannels.map((channel) => (
              <Chip
                key={channel.id}
                selected={selectedChannels.includes(channel.id)}
                onPress={() => toggleChannel(channel.id)}
                style={[
                  styles.channelChip,
                  selectedChannels.includes(channel.id) && {
                    backgroundColor: channelFill(channel.id, channel.color),
                  },
                ]}
                textStyle={[
                  selectedChannels.includes(channel.id) && styles.selectedChannelText,
                  selectedChannels.includes(channel.id) && { color: channelInk(channel.id) },
                ]}
                icon={() => (
                  <Title style={styles.channelIcon}>{channel.icon}</Title>
                )}
              >
                {channel.name}
              </Chip>
            ))}
          </View>

          <Divider style={styles.divider} />

          <Paragraph style={styles.label}>Post Content:</Paragraph>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={content}
            onChangeText={handleContentChange}
            placeholder="What's happening with the team?"
            style={styles.textInput}
          />

          <View style={styles.charCounter}>
            <Paragraph
              style={[styles.charCountText, isOverLimit && styles.overLimit]}
            >
              {charCount} / {charLimit}
            </Paragraph>
            {selectedChannels.includes('x') && (
              <Paragraph style={styles.limitInfo}>
                𝕏 has a 280 character limit
              </Paragraph>
            )}
          </View>

          <Divider style={styles.divider} />

          <Paragraph style={styles.label}>Media (optional):</Paragraph>
          <View style={styles.mediaContainer}>
            {mediaUrls.map((url, index) => (
              <View key={index} style={styles.mediaPreview}>
                <Image source={{ uri: url }} style={styles.mediaImage} />
                <IconButton
                  icon="close-circle"
                  size={24}
                  style={styles.removeMediaButton}
                  onPress={() =>
                    setMediaUrls(mediaUrls.filter((_, i) => i !== index))
                  }
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addMediaButton}
              onPress={handleAddMedia}
            >
              <IconButton icon="camera" size={32} />
              <Paragraph style={styles.addMediaText}>Add Photo</Paragraph>
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.previewSection}>
            <Paragraph style={styles.label}>Preview:</Paragraph>
            <Card style={styles.previewCard}>
              <Card.Content>
                <View style={styles.previewHeader}>
                  <Title style={styles.previewTeam}>{clubName}</Title>
                  <Paragraph style={styles.previewTime}>Just now</Paragraph>
                </View>
                <Paragraph style={styles.previewContent}>
                  {content || 'Your post content will appear here...'}
                </Paragraph>
                {selectedChannels.length > 0 && (
                  <View style={styles.previewChannels}>
                    {selectedChannels.map((id) => {
                      const channel = socialChannels.find((c) => c.id === id);
                      return (
                        <Chip
                          key={id}
                          compact
                          style={[
                            styles.previewChannelChip,
                            { backgroundColor: channelFill(id, channel?.color ?? COLORS.surfaceRaised) },
                          ]}
                          textStyle={[styles.previewChannelText, { color: channelInk(id) }]}
                        >
                          {channel?.icon}
                        </Chip>
                      );
                    })}
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handlePost}
              style={styles.actionButton}
              disabled={isOverLimit || !content.trim()}
            >
              Post Now
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const useStyles = themedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  card: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: 18,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    color: COLORS.text,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  channelChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChannelText: {
    fontWeight: 'bold',
  },
  channelIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  divider: {
    marginVertical: 16,
  },
  textInput: {
    marginBottom: 8,
    minHeight: 120,
  },
  charCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCountText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  overLimit: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  limitInfo: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  mediaPreview: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  mediaImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
  },
  addMediaButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceRaised,
  },
  addMediaText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: -8,
  },
  previewSection: {
    marginTop: 8,
  },
  previewCard: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTeam: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  previewTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  previewContent: {
    fontSize: 14,
    marginBottom: 12,
    color: COLORS.text,
  },
  previewChannels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewChannelChip: {
    marginRight: 4,
    height: 24,
  },
  previewChannelText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}));
