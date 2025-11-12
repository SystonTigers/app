import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, List, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../config';

// Mock recent videos
const mockRecentVideos = [
  {
    id: '1',
    title: 'Match vs Leicester Panthers',
    date: '2025-11-03',
    duration: '5:30',
    thumbnail: 'https://via.placeholder.com/150',
    status: 'uploaded',
  },
  {
    id: '2',
    title: 'John Smith - Goal Compilation',
    date: '2025-10-28',
    duration: '2:15',
    thumbnail: 'https://via.placeholder.com/150',
    status: 'processing',
  },
];

export default function VideoScreen() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await MediaLibrary.requestPermissionsAsync();

    if (cameraStatus.granted && mediaStatus.granted) {
      setHasPermissions(true);
      return true;
    }
    Alert.alert('Permissions required', 'Camera and media library access needed');
    return false;
  };

  const recordVideo = async () => {
    const hasPerms = hasPermissions || await requestPermissions();
    if (!hasPerms) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['video'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets[0].uri) {
        setSelectedVideo(result.assets[0].uri);
        Alert.alert('Video recorded!', 'Ready to upload or edit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video');
      console.error(error);
    }
  };

  const selectVideo = async () => {
    const hasPerms = hasPermissions || await requestPermissions();
    if (!hasPerms) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['video'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSelectedVideo(result.assets[0].uri);
        Alert.alert('Video selected!', 'Ready to upload');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select video');
      console.error(error);
    }
  };

  const uploadVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('No video', 'Please record or select a video first');
      return;
    }

    // TODO: Upload to server
    // const formData = new FormData();
    // formData.append('video', { uri: selectedVideo, name: 'video.mp4', type: 'video/mp4' });
    // await api.post('/api/v1/videos/upload', formData);

    Alert.alert(
      'Upload Started',
      'Video will be processed by AI and added to highlights. You\'ll be notified when ready!'
    );
    setSelectedVideo(null);
  };

  const trimVideo = () => {
    Alert.alert(
      'Trim Video',
      'Video trimming will open in the next update. For now, upload and our AI will create highlights automatically!'
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title>🎬 Videos & Highlights</Title>
        <Paragraph style={styles.subtitle}>
          Record, upload, or view match highlights
        </Paragraph>
      </View>

      {/* Action Buttons */}
      <Card style={styles.actionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Create Highlight</Title>
          <Paragraph style={styles.sectionSubtitle}>
            Record or upload match footage
          </Paragraph>

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              icon="video"
              onPress={recordVideo}
              style={styles.actionButton}
              buttonColor={COLORS.primary}
              textColor={COLORS.secondary}
            >
              Record Video
            </Button>
            <Button
              mode="outlined"
              icon="folder-open"
              onPress={selectVideo}
              style={styles.actionButton}
            >
              Select Video
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Selected Video Preview */}
      {selectedVideo && (
        <Card style={styles.previewCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Selected Video</Title>

            <View style={styles.videoContainer}>
              <Video
                source={{ uri: selectedVideo }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={isPlaying}
                onPlaybackStatusUpdate={(status) => {
                  if ('isPlaying' in status) {
                    setIsPlaying(status.isPlaying);
                  }
                }}
              />
            </View>

            <View style={styles.videoActions}>
              <Button
                mode="outlined"
                icon="content-cut"
                onPress={trimVideo}
                style={styles.editButton}
              >
                Trim
              </Button>
              <Button
                mode="contained"
                icon="upload"
                onPress={uploadVideo}
                style={styles.editButton}
                buttonColor={COLORS.success}
              >
                Upload
              </Button>
              <Button
                mode="text"
                icon="close"
                onPress={() => setSelectedVideo(null)}
                style={styles.editButton}
              >
                Cancel
              </Button>
            </View>

            <Paragraph style={styles.hint}>
              💡 Tip: Upload full match video and our AI will automatically create highlights!
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* How It Works */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>🤖 AI-Powered Processing</Title>
          <List.Item
            title="1. Upload Video"
            description="Record or select match footage"
            left={(props) => <List.Icon {...props} icon="upload" />}
          />
          <List.Item
            title="2. AI Detection"
            description="Automatically finds goals, cards, key moments"
            left={(props) => <List.Icon {...props} icon="robot" />}
          />
          <List.Item
            title="3. Auto-Edit"
            description="Creates professional highlight clips"
            left={(props) => <List.Icon {...props} icon="movie-edit" />}
          />
          <List.Item
            title="4. Share"
            description="Clips posted to social media automatically"
            left={(props) => <List.Icon {...props} icon="share-variant" />}
          />
        </Card.Content>
      </Card>

      {/* Recent Videos */}
      <View style={styles.recentSection}>
        <Title style={styles.sectionTitle}>Recent Highlights</Title>
        {mockRecentVideos.map((video) => (
          <Card key={video.id} style={styles.videoCard}>
            <Card.Content>
              <View style={styles.videoItem}>
                <View style={styles.thumbnailPlaceholder}>
                  <IconButton icon="play-circle" size={40} iconColor={COLORS.primary} />
                </View>
                <View style={styles.videoInfo}>
                  <Paragraph style={styles.videoTitle}>{video.title}</Paragraph>
                  <Paragraph style={styles.videoMeta}>
                    {video.date} • {video.duration}
                  </Paragraph>
                  <Paragraph
                    style={[
                      styles.videoStatus,
                      { color: video.status === 'uploaded' ? COLORS.success : COLORS.warning },
                    ]}
                  >
                    {video.status === 'uploaded' ? '✓ Uploaded' : '⏳ Processing'}
                  </Paragraph>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Info Box */}
      <Card style={styles.infoBox}>
        <Card.Content>
          <Title style={styles.infoTitle}>💡 Pro Tips</Title>
          <Paragraph style={styles.infoParagraph}>
            • Hold phone horizontally for best quality
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            • Upload full match for AI to find all highlights
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            • Processing takes 5-15 minutes depending on video length
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            • You'll get notified when highlights are ready
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
  },
  subtitle: {
    color: COLORS.textLight,
  },
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: COLORS.textLight,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  previewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  recentSection: {
    padding: 16,
  },
  videoCard: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 60,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  videoMeta: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  videoStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  infoBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF9E6',
  },
  infoTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoParagraph: {
    fontSize: 13,
    marginBottom: 4,
    color: COLORS.text,
  },
});
