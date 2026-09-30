import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Portal, Modal, TextInput, Chip, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { playerImagesApi, squadApi } from '../services/api';

interface PlayerImage {
  id: string;
  playerId: string;
  playerName: string;
  type: 'headshot' | 'action';
  imageUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export default function ManagePlayerImagesScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<PlayerImage[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
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
    loadData();
  }, [selectedFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const type = selectedFilter === 'all' ? undefined : selectedFilter === 'headshots' ? 'headshot' : 'action';

      const [imagesRes, squadRes] = await Promise.all([
        playerImagesApi.listImages(undefined, type),
        squadApi.getSquad()
      ]);

      if (imagesRes.success && imagesRes.data) {
        setImages(imagesRes.data);
      }

      if (squadRes.success && squadRes.data) {
        setPlayers(squadRes.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data. Please check connection.');
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

    const result = await ImagePicker.launchImageLibraryAsync({
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
        imageUri: uploadData.imageUri,
      });

      if (response.success) {
        await loadData();
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
                await loadData();
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
      <Paragraph style={styles.intro}>Upload headshots & action photos</Paragraph>

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
            <Title style={styles.infoTitle}>Image Guidelines</Title>
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
                    <View
                      style={styles.typeBadge}
                      accessibilityLabel={image.type === 'headshot' ? 'Headshot' : 'Action shot'}
                    >
                      <MaterialCommunityIcons
                        name={image.type === 'headshot' ? 'account' : 'soccer'}
                        size={14}
                        color={COLORS.primary}
                      />
                    </View>
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
            <Title style={styles.bulkTitle}>Bulk Import</Title>
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
        color={COLORS.onPrimary}
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
            {players.map((player: any) => (
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
              icon="account"
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
              Headshot
            </Chip>
            <Chip
              icon="soccer"
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
              Action Shot
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
                    icon={selectedImage.type === 'headshot' ? 'account' : 'soccer'}
                    style={styles.detailTypeChip}
                    textStyle={styles.detailTypeChipText}
                  >
                    {selectedImage.type === 'headshot' ? 'Headshot' : 'Action Shot'}
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
                iconColor={COLORS.text}
                accessibilityLabel="Close"
              />
            </>
          )}
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
  intro: {
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.text,
  },
  filterChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  infoTitle: {
    fontSize: 20,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  playerName: {
    fontSize: 20,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
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
    borderRadius: 12,
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,9,12,0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  bulkTitle: {
    fontSize: 20,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
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
    margin: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 20,
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
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerChipSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  playerChipText: {
    color: COLORS.text,
  },
  playerChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeSelectChip: {
    flex: 1,
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeSelectChipSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  typeSelectChipText: {
    color: COLORS.text,
  },
  typeSelectChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginVertical: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
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
    margin: 20,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 0,
    maxHeight: '90%',
  },
  detailImage: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.background,
    resizeMode: 'contain',
  },
  detailContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontFamily: FONTS.display,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailTypeChip: {
    backgroundColor: COLORS.primarySoft,
  },
  detailTypeChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailInfo: {
    fontSize: 13,
    color: COLORS.textLight,
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
    backgroundColor: 'rgba(7,9,12,0.7)',
  },
}));
