import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Portal, Modal, TextInput, Chip, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../config';
import { playerImagesApi } from '../services/api';

interface PlayerImage {
  id: string;
  playerId: string;
  playerName: string;
  type: 'headshot' | 'action';
  imageUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

const mockPlayerImages: PlayerImage[] = [
  { id: '1', playerId: 'p1', playerName: 'James Mitchell', type: 'headshot', imageUrl: 'https://picsum.photos/400/400?random=101', uploadedAt: '2025-10-01', uploadedBy: 'Admin' },
  { id: '2', playerId: 'p1', playerName: 'James Mitchell', type: 'action', imageUrl: 'https://picsum.photos/400/400?random=102', uploadedAt: '2025-09-15', uploadedBy: 'Admin' },
  { id: '3', playerId: 'p2', playerName: 'Tom Davies', type: 'headshot', imageUrl: 'https://picsum.photos/400/400?random=103', uploadedAt: '2025-10-01', uploadedBy: 'Admin' },
  { id: '4', playerId: 'p2', playerName: 'Tom Davies', type: 'action', imageUrl: 'https://picsum.photos/400/400?random=104', uploadedAt: '2025-09-20', uploadedBy: 'Admin' },
  { id: '5', playerId: 'p3', playerName: 'Luke Harrison', type: 'headshot', imageUrl: 'https://picsum.photos/400/400?random=105', uploadedAt: '2025-09-28', uploadedBy: 'Admin' },
];

const mockPlayers = [
  { id: 'p1', name: 'James Mitchell', number: 9 },
  { id: 'p2', name: 'Tom Davies', number: 10 },
  { id: 'p3', name: 'Luke Harrison', number: 7 },
  { id: 'p4', name: 'Sam Roberts', number: 4 },
  { id: 'p5', name: 'Ben Parker', number: 1 },
];

export default function ManagePlayerImagesScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<PlayerImage[]>(mockPlayerImages);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PlayerImage | null>(null);
  const [uploadData, setUploadData] = useState({
    playerId: '',
    playerName: '',
    type: 'headshot' as 'headshot' | 'action',
    imageUri: null as string | null,
  });
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'headshots' | 'action'>('all');

  useEffect(() => {
    loadImages();
  }, [selectedFilter]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const type = selectedFilter === 'all' ? undefined : selectedFilter === 'headshots' ? 'headshot' : 'action';
      const response = await playerImagesApi.listImages(undefined, type);
      if (response.success && response.data) {
        setImages(response.data);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      Alert.alert('Error', 'Failed to load player images. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: uploadData.type === 'headshot' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadData({ ...uploadData, imageUri: result.assets[0].uri });
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
      aspect: uploadData.type === 'headshot' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadData({ ...uploadData, imageUri: result.assets[0].uri });
    }
  };

  const handleUpload = async () => {
    if (!uploadData.playerId || !uploadData.imageUri) {
      Alert.alert('Missing Information', 'Please select a player and upload an image.');
      return;
    }

    try {
      setUploading(true);
      const response = await playerImagesApi.createImage({
        playerId: uploadData.playerId,
        playerName: uploadData.playerName,
        type: uploadData.type,
        imageUrl: uploadData.imageUri,
        r2Key: `players/${uploadData.playerId}/${Date.now()}.jpg`,
      });

      if (response.success) {
        await loadImages();
        setUploadModalVisible(false);
        setUploadData({ playerId: '', playerName: '', type: 'headshot', imageUri: null });
        Alert.alert('Success', 'Player image uploaded successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = (imageId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await playerImagesApi.deleteImage(imageId);
              if (response.success) {
                setSelectedImage(null);
                await loadImages();
                Alert.alert('Deleted', 'Image has been removed.');
              } else {
                Alert.alert('Error', 'Failed to delete image.');
              }
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete image.');
            }
          }
        }
      ]
    );
  };

  const replaceImage = (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      setUploadData({
        playerId: image.playerId,
        playerName: image.playerName,
        type: image.type,
        imageUri: null,
      });
      setSelectedImage(null);
      setUploadModalVisible(true);
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Image',
      'Choose how you want to upload',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const filteredImages = images.filter(img => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'headshots') return img.type === 'headshot';
    if (selectedFilter === 'action') return img.type === 'action';
    return true;
  });

  const groupedImages = filteredImages.reduce((acc, img) => {
    if (!acc[img.playerName]) {
      acc[img.playerName] = [];
    }
    acc[img.playerName].push(img);
    return acc;
  }, {} as Record<string, PlayerImage[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Manage Player Images</Title>
        <Paragraph style={styles.headerSubtitle}>Upload headshots & action photos</Paragraph>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextSelected]}
        >
          All ({images.length})
        </Chip>
        <Chip
          selected={selectedFilter === 'headshots'}
          onPress={() => setSelectedFilter('headshots')}
          style={[styles.filterChip, selectedFilter === 'headshots' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, selectedFilter === 'headshots' && styles.filterChipTextSelected]}
        >
          Headshots ({images.filter(i => i.type === 'headshot').length})
        </Chip>
        <Chip
          selected={selectedFilter === 'action'}
          onPress={() => setSelectedFilter('action')}
          style={[styles.filterChip, selectedFilter === 'action' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, selectedFilter === 'action' && styles.filterChipTextSelected]}
        >
          Action ({images.filter(i => i.type === 'action').length})
        </Chip>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.infoTitle}>📸 Image Guidelines</Title>
            <Paragraph style={styles.infoText}>
              • Headshots: Square (1:1), clear face, plain background{'\n'}
              • Action shots: Match photos, training, celebrations{'\n'}
              • Min resolution: 800x800px for headshots{'\n'}
              • File formats: JPG, PNG{'\n'}
              • Max size: 5MB per image
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Grouped Images by Player */}
        {Object.entries(groupedImages).map(([playerName, playerImages]) => (
          <Card key={playerName} style={styles.playerCard}>
            <Card.Content>
              <Title style={styles.playerName}>{playerName}</Title>
              <View style={styles.imagesGrid}>
                {playerImages.map((image) => (
                  <TouchableOpacity
                    key={image.id}
                    style={styles.imageItem}
                    onPress={() => setSelectedImage(image)}
                  >
                    <Image source={{ uri: image.imageUrl }} style={styles.imageThumb} />
                    <Chip
                      style={[
                        styles.typeChip,
                        { backgroundColor: image.type === 'headshot' ? '#2196F3' : '#4CAF50' }
                      ]}
                      textStyle={styles.typeChipText}
                    >
                      {image.type === 'headshot' ? '👤' : '⚽'}
                    </Chip>
                  </TouchableOpacity>
                ))}
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredImages.length === 0 && (
          <View style={styles.emptyState}>
            <Paragraph style={styles.emptyText}>No images found</Paragraph>
            <Paragraph style={styles.emptySubtext}>Upload player photos to get started</Paragraph>
          </View>
        )}

        {/* Bulk Import Info */}
        <Card style={styles.bulkCard}>
          <Card.Content>
            <Title style={styles.bulkTitle}>📁 Bulk Import</Title>
            <Paragraph style={styles.bulkText}>
              Need to upload multiple images at once? Contact admin to set up bulk import from Google Drive or folder.
            </Paragraph>
            <Button
              mode="outlined"
              icon="email"
              onPress={() => Alert.alert('Bulk Import', 'Contact your system administrator to set up bulk image imports.')}
              style={styles.bulkButton}
            >
              Request Bulk Import
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="camera-plus"
        label="Upload"
        style={styles.fab}
        color={COLORS.secondary}
        onPress={() => setUploadModalVisible(true)}
      />

      {/* Upload Modal */}
      <Portal>
        <Modal
          visible={uploadModalVisible}
          onDismiss={() => {
            setUploadModalVisible(false);
            setUploadData({ playerId: '', playerName: '', type: 'headshot', imageUri: null });
          }}
          contentContainerStyle={styles.uploadModal}
        >
          <Title style={styles.modalTitle}>Upload Player Image</Title>

          {/* Player Selection */}
          <Paragraph style={styles.modalLabel}>Select Player</Paragraph>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelector}>
            {mockPlayers.map(player => (
              <Chip
                key={player.id}
                selected={uploadData.playerId === player.id}
                onPress={() => setUploadData({ ...uploadData, playerId: player.id, playerName: player.name })}
                style={[
                  styles.playerChip,
                  uploadData.playerId === player.id && styles.playerChipSelected
                ]}
                textStyle={[
                  styles.playerChipText,
                  uploadData.playerId === player.id && styles.playerChipTextSelected
                ]}
              >
                #{player.number} {player.name}
              </Chip>
            ))}
          </ScrollView>

          {/* Image Type Selection */}
          <Paragraph style={styles.modalLabel}>Image Type</Paragraph>
          <View style={styles.typeSelector}>
            <Chip
              selected={uploadData.type === 'headshot'}
              onPress={() => setUploadData({ ...uploadData, type: 'headshot' })}
              style={[
                styles.typeSelectChip,
                uploadData.type === 'headshot' && styles.typeSelectChipSelected
              ]}
              textStyle={[
                styles.typeSelectChipText,
                uploadData.type === 'headshot' && styles.typeSelectChipTextSelected
              ]}
            >
              👤 Headshot
            </Chip>
            <Chip
              selected={uploadData.type === 'action'}
              onPress={() => setUploadData({ ...uploadData, type: 'action' })}
              style={[
                styles.typeSelectChip,
                uploadData.type === 'action' && styles.typeSelectChipSelected
              ]}
              textStyle={[
                styles.typeSelectChipText,
                uploadData.type === 'action' && styles.typeSelectChipTextSelected
              ]}
            >
              ⚽ Action Shot
            </Chip>
          </View>

          {/* Image Preview */}
          {uploadData.imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: uploadData.imageUri }} style={styles.imagePreview} />
              <IconButton
                icon="close-circle"
                size={32}
                iconColor={COLORS.error}
                onPress={() => setUploadData({ ...uploadData, imageUri: null })}
                style={styles.removeImageButton}
              />
            </View>
          ) : (
            <Button
              mode="outlined"
              icon="camera"
              onPress={showUploadOptions}
              style={styles.uploadButton}
            >
              Select Image
            </Button>
          )}

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setUploadModalVisible(false);
                setUploadData({ playerId: '', playerName: '', type: 'headshot', imageUri: null });
              }}
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
              disabled={!uploadData.playerId || !uploadData.imageUri}
            >
              Upload
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Image Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedImage}
          onDismiss={() => setSelectedImage(null)}
          contentContainerStyle={styles.detailModal}
        >
          {selectedImage && (
            <>
              <Image source={{ uri: selectedImage.imageUrl }} style={styles.detailImage} />
              <View style={styles.detailContent}>
                <Title style={styles.detailTitle}>{selectedImage.playerName}</Title>
                <View style={styles.detailMeta}>
                  <Chip
                    style={[
                      styles.detailTypeChip,
                      { backgroundColor: selectedImage.type === 'headshot' ? '#2196F3' : '#4CAF50' }
                    ]}
                    textStyle={styles.detailTypeChipText}
                  >
                    {selectedImage.type === 'headshot' ? '👤 Headshot' : '⚽ Action Shot'}
                  </Chip>
                </View>
                <Paragraph style={styles.detailInfo}>
                  Uploaded: {new Date(selectedImage.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Paragraph>
                <Paragraph style={styles.detailInfo}>By: {selectedImage.uploadedBy}</Paragraph>

                <View style={styles.detailButtons}>
                  <Button
                    mode="outlined"
                    icon="swap-horizontal"
                    onPress={() => replaceImage(selectedImage.id)}
                    style={styles.detailButton}
                  >
                    Replace
                  </Button>
                  <Button
                    mode="outlined"
                    icon="delete"
                    onPress={() => deleteImage(selectedImage.id)}
                    style={styles.detailButton}
                    textColor={COLORS.error}
                  >
                    Delete
                  </Button>
                </View>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setSelectedImage(null)}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.primary,
  },
  filterChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
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
  playerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  typeChip: {
    position: 'absolute',
    top: 4,
    right: 4,
    height: 24,
  },
  typeChipText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  bulkCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  bulkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bulkText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  bulkButton: {
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  // Upload Modal
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  playerSelector: {
    marginBottom: 8,
  },
  playerChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  playerChipSelected: {
    backgroundColor: COLORS.primary,
  },
  playerChipText: {
    color: COLORS.primary,
  },
  playerChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeSelectChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  typeSelectChipSelected: {
    backgroundColor: COLORS.primary,
  },
  typeSelectChipText: {
    color: COLORS.primary,
  },
  typeSelectChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginVertical: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: COLORS.surface,
  },
  uploadButton: {
    marginVertical: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  // Detail Modal
  detailModal: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: '90%',
  },
  detailImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  detailContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  detailMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailTypeChip: {
    height: 28,
  },
  detailTypeChipText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailInfo: {
    fontSize: 13,
    color: COLORS.secondary,
    opacity: 0.8,
    marginBottom: 4,
  },
  detailButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  detailButton: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
