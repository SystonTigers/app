import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, FAB, Portal, Modal, TextInput, Checkbox, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../config';
import { galleryApi } from '../services/api';

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 images per row with spacing

interface Photo {
  id: string;
  uri: string;
  albumId: string;
  uploadedBy: string;
  uploadedAt: string;
  caption?: string;
  tags: string[];
}

interface Album {
  id: string;
  title: string;
  date: string;
  coverPhoto: string;
  photoCount: number;
  type: 'match' | 'training' | 'social' | 'throwback';
}

// Mocks removed

export default function GalleryScreen() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadData, setUploadData] = useState({
    image: null as string | null,
    caption: '',
    consentGiven: false,
    isThrowback: false,
  });

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      loadPhotos(selectedAlbum.id);
    }
  }, [selectedAlbum]);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const data = await galleryApi.getAlbums();
      if (data && Array.isArray(data)) {
        setAlbums(data);
      }
    } catch (err) {
      console.warn('Failed to load albums', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (albumId: string) => {
    setLoading(true);
    try {
      const data = await galleryApi.getPhotos(albumId);
      if (data && Array.isArray(data)) {
        setPhotos(data);
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.warn('Failed to load photos', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const getAlbumTypeColor = (type: Album['type']) => {
    switch (type) {
      case 'match': return '#4CAF50';
      case 'training': return '#2196F3';
      case 'social': return '#FF9800';
      case 'throwback': return '#9C27B0';
      default: return COLORS.primary;
    }
  };

  const getAlbumTypeIcon = (type: Album['type']) => {
    switch (type) {
      case 'match': return '⚽';
      case 'training': return '🏃';
      case 'social': return '🎉';
      case 'throwback': return '⏰';
      default: return '📸';
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadData({ ...uploadData, image: result.assets[0].uri });
      setUploadModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadData({ ...uploadData, image: result.assets[0].uri });
      setUploadModalVisible(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.consentGiven) {
      Alert.alert('Consent Required', 'Please confirm that you have consent to upload this photo.');
      return;
    }

    if (!uploadData.image) return;

    try {
      await galleryApi.uploadPhoto({
        imageUri: uploadData.image,
        caption: uploadData.caption,
        albumId: selectedAlbum?.id,
        tags: uploadData.isThrowback ? ['throwback'] : []
      });

      Alert.alert('Success', 'Photo uploaded!');
      setUploadModalVisible(false);
      setUploadData({ image: null, caption: '', consentGiven: false, isThrowback: false });

      // Refresh photos
      if (selectedAlbum) loadPhotos(selectedAlbum.id);
    } catch (err) {
      console.error('Upload failed', err);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const requestRemoval = (photo: Photo) => {
    Alert.alert(
      'Request Photo Removal',
      'Would you like to request removal of this photo? Your request will be reviewed by team admins.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Removal',
          style: 'destructive',
          onPress: async () => {
            try {
              await galleryApi.requestRemoval(photo.id);
              Alert.alert('Request Sent', 'Your removal request has been submitted to team admins.');
              setSelectedPhoto(null);
            } catch (err) {
              Alert.alert('Error', 'Failed to submit request');
            }
          }
        }
      ]
    );
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Photo',
      'Choose how you want to upload',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Album View
  if (selectedAlbum) {
    const albumPhotos = photos; // use loaded photos

    return (
      <View style={styles.container}>
        <View style={styles.albumHeader}>
          <IconButton
            icon="arrow-left"
            iconColor={COLORS.secondary}
            size={24}
            onPress={() => setSelectedAlbum(null)}
          />
          <View style={styles.albumHeaderContent}>
            <Title style={styles.albumTitle}>{selectedAlbum.title}</Title>
            <Paragraph style={styles.albumSubtitle}>
              {new Date(selectedAlbum.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {selectedAlbum.photoCount} photos
            </Paragraph>
          </View>
        </View>

        <ScrollView style={styles.photosContainer}>
          <View style={styles.photoGrid}>
            {albumPhotos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoItem}
                onPress={() => setSelectedPhoto(photo)}
              >
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <FAB
          icon="camera"
          label="Upload"
          style={styles.fab}
          color={COLORS.secondary}
          onPress={showUploadOptions}
        />

        {/* Photo Detail Modal */}
        <Portal>
          <Modal
            visible={!!selectedPhoto}
            onDismiss={() => setSelectedPhoto(null)}
            contentContainerStyle={styles.photoModal}
          >
            {selectedPhoto && (
              <>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.fullPhoto} />
                <View style={styles.photoDetails}>
                  {selectedPhoto.caption && (
                    <Paragraph style={styles.photoCaption}>{selectedPhoto.caption}</Paragraph>
                  )}
                  <Paragraph style={styles.photoMeta}>
                    Uploaded by {selectedPhoto.uploadedBy} • {selectedPhoto.uploadedAt}
                  </Paragraph>
                  <Button
                    mode="outlined"
                    onPress={() => requestRemoval(selectedPhoto)}
                    style={styles.removalButton}
                    textColor={COLORS.error}
                  >
                    Request Removal
                  </Button>
                </View>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setSelectedPhoto(null)}
                  style={styles.closeButton}
                  iconColor={COLORS.secondary}
                />
              </>
            )}
          </Modal>
        </Portal>
      </View>
    );
  }

  // Albums Grid View
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Gallery</Title>
        <Paragraph style={styles.headerSubtitle}>Team photos & memories</Paragraph>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.albumsGrid}>
          {albums.map((album) => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              onPress={() => setSelectedAlbum(album)}
            >
              <Image source={{ uri: album.coverPhoto }} style={styles.albumCover} />
              <View style={styles.albumOverlay}>
                <View style={styles.albumTypeChip}>
                  <Paragraph style={styles.albumTypeIcon}>{getAlbumTypeIcon(album.type)}</Paragraph>
                </View>
                <View style={styles.albumInfo}>
                  <Paragraph style={styles.albumCardTitle} numberOfLines={1}>
                    {album.title}
                  </Paragraph>
                  <Paragraph style={styles.albumCardSubtitle}>
                    {new Date(album.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {album.photoCount} photos
                  </Paragraph>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* GDPR Notice */}
        <Card style={styles.gdprCard}>
          <Card.Content>
            <Title style={styles.gdprTitle}>📋 Privacy & Consent</Title>
            <Paragraph style={styles.gdprText}>
              Before uploading photos, please ensure:
            </Paragraph>
            <View style={styles.gdprList}>
              <Paragraph style={styles.gdprItem}>• You have consent from individuals in the photo</Paragraph>
              <Paragraph style={styles.gdprItem}>• Parents/guardians have consented for minors (U18)</Paragraph>
              <Paragraph style={styles.gdprItem}>• Photos are appropriate for a family-friendly environment</Paragraph>
            </View>
            <Paragraph style={styles.gdprText}>
              Anyone can request photo removal at any time. Requests are reviewed by team admins within 48 hours.
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>

      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <FAB
        icon="camera"
        label="Upload Photo"
        style={styles.fab}
        color={COLORS.secondary}
        onPress={showUploadOptions}
      />

      {/* Upload Modal */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={() => setUploadModalVisible(false)}
          contentContainerStyle={styles.uploadModal}
        >
          <Title style={styles.modalTitle}>Upload Photo</Title>

          {uploadData.image && (
            <Image source={{ uri: uploadData.image }} style={styles.uploadPreview} />
          )}

          <TextInput
            label="Caption (optional)"
            value={uploadData.caption}
            onChangeText={(text) => setUploadData({ ...uploadData, caption: text })}
            mode="outlined"
            style={styles.captionInput}
            multiline
            numberOfLines={3}
          />

          <View style={styles.checkboxRow}>
            <Checkbox
              status={uploadData.isThrowback ? 'checked' : 'unchecked'}
              onPress={() => setUploadData({ ...uploadData, isThrowback: !uploadData.isThrowback })}
              color={COLORS.primary}
            />
            <Paragraph style={styles.checkboxLabel}>Tag as Throwback Thursday</Paragraph>
          </View>

          <View style={styles.consentSection}>
            <View style={styles.checkboxRow}>
              <Checkbox
                status={uploadData.consentGiven ? 'checked' : 'unchecked'}
                onPress={() => setUploadData({ ...uploadData, consentGiven: !uploadData.consentGiven })}
                color={COLORS.primary}
              />
              <Paragraph style={styles.checkboxLabel}>I confirm consent to upload</Paragraph>
            </View>
            <Paragraph style={styles.consentText}>
              I have obtained consent from all individuals (or their parents/guardians for U18s) pictured in this photo.
            </Paragraph>
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setUploadModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpload}
              style={styles.modalButton}
              buttonColor={COLORS.primary}
              textColor={COLORS.secondary}
              disabled={!uploadData.consentGiven}
            >
              Upload
            </Button>
          </View>
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
  albumsGrid: {
    padding: 16,
    gap: 16,
  },
  albumCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
  },
  albumCover: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  albumOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  albumTypeChip: {
    position: 'absolute',
    top: -170,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  albumTypeIcon: {
    fontSize: 20,
    color: COLORS.secondary,
  },
  albumInfo: {
    gap: 4,
  },
  albumCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  albumCardSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    opacity: 0.9,
  },
  gdprCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  gdprTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gdprText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  gdprList: {
    marginVertical: 8,
  },
  gdprItem: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  // Album view styles
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingRight: 20,
    paddingVertical: 8,
  },
  albumHeaderContent: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  albumSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  photosContainer: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  photoItem: {
    width: imageSize,
    height: imageSize,
    padding: 4,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: '90%',
  },
  fullPhoto: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
  },
  photoDetails: {
    padding: 20,
  },
  photoCaption: {
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  photoMeta: {
    fontSize: 12,
    color: COLORS.secondary,
    opacity: 0.7,
    marginBottom: 16,
  },
  removalButton: {
    borderColor: COLORS.error,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Upload modal styles
  uploadModal: {
    backgroundColor: COLORS.surface,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  uploadPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  captionInput: {
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  consentSection: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  consentText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 40,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    flex: 1,
  },
});
