import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Button, FAB, IconButton, Modal, Portal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import { apiErrorMessage, galleryApi, type GalleryAlbum, type GalleryPhoto } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';
import AlbumFormModal from '../components/gallery/AlbumFormModal';
import UploadPhotosModal from '../components/gallery/UploadPhotosModal';
import { groupBySeason, kindOf, photoCount } from '../utils/gallery';
import { resultDate } from '../utils/results';

const MAX_PICK = 30;

/**
 * Club gallery: albums of match days, training, days out and throwbacks,
 * grouped by season so old photos are easy to find. Members look; staff
 * make albums, add photos (several at once) and remove them.
 */
export default function GalleryScreen() {
  const COLORS = useBrandColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const isStaff = isStaffRole(user?.role);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [album, setAlbum] = useState<GalleryAlbum | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photo, setPhoto] = useState<GalleryPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [albumForm, setAlbumForm] = useState<{ open: boolean; editing: GalleryAlbum | null }>({ open: false, editing: null });
  const [picked, setPicked] = useState<string[]>([]);

  const columns = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const tile = Math.floor((Math.min(width, 1100) - 16) / columns) - 8;

  const loadAlbums = useCallback(async () => {
    setError('');
    try {
      setAlbums(await galleryApi.getAlbums());
    } catch (err) {
      setError(apiErrorMessage(err, "The gallery couldn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadPhotos = useCallback(async (albumId: string) => {
    setError('');
    try {
      setPhotos(await galleryApi.getPhotos(albumId));
    } catch (err) {
      setError(apiErrorMessage(err, "Photos couldn't load. Check your signal and pull to refresh."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);
  useEffect(() => {
    if (!album) return;
    setPhotos([]);
    setLoading(true);
    loadPhotos(album.id);
  }, [album, loadPhotos]);

  const seasons = useMemo(() => groupBySeason(albums), [albums]);

  const pick = async (camera: boolean) => {
    setNotice('');
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError(camera ? 'Allow the camera for this app to take a photo.' : 'Allow photos for this app to choose pictures.');
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: MAX_PICK });
      if (result.canceled) return;
      const uris = (result.assets || []).map((a) => a.uri).filter(Boolean).slice(0, MAX_PICK);
      if ((result.assets || []).length > MAX_PICK) setNotice(`Up to ${MAX_PICK} photos at a time; the first ${MAX_PICK} are ready to upload.`);
      setPicked(uris);
    } catch (err) {
      setError(apiErrorMessage(err, "Those photos couldn't be opened. Please try again."));
    }
  };

  const removePhoto = (p: GalleryPhoto) => {
    Alert.alert('Remove this photo?', 'It is removed for everyone and can\'t be brought back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await galleryApi.deletePhoto(p.id);
            setPhoto(null);
            setPhotos((list) => list.filter((x) => x.id !== p.id));
            setNotice('Photo removed.');
            loadAlbums();
          } catch (err) {
            setError(apiErrorMessage(err, "That photo couldn't be removed. Please try again."));
          }
        },
      },
    ]);
  };

  const removeAlbum = (a: GalleryAlbum) => {
    Alert.alert(`Remove "${a.title}"?`, `The album and its ${photoCount(a.photoCount)} are removed for everyone and can't be brought back.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove album',
        style: 'destructive',
        onPress: async () => {
          try {
            await galleryApi.deleteAlbum(a.id);
            setAlbum(null);
            setNotice(`"${a.title}" removed.`);
            loadAlbums();
          } catch (err) {
            setError(apiErrorMessage(err, "That album couldn't be removed. Please try again."));
          }
        },
      },
    ]);
  };

  const messages = (
    <>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    </>
  );

  const modals = (
    <>
      <AlbumFormModal
        visible={albumForm.open}
        editing={albumForm.editing}
        onClose={() => setAlbumForm({ open: false, editing: null })}
        onSaved={(saved) => {
          setAlbumForm({ open: false, editing: null });
          setNotice(albumForm.editing ? 'Album updated.' : `"${saved.title}" is ready. Add some photos.`);
          setAlbum(saved);
          loadAlbums();
        }}
      />
      {album ? (
        <UploadPhotosModal
          uris={picked}
          albumId={album.id}
          onClose={() => setPicked([])}
          onDone={(message, failed) => {
            setPicked([]);
            if (failed.length) setError(message);
            else setNotice(message);
            loadPhotos(album.id);
            loadAlbums();
          }}
        />
      ) : null}
    </>
  );

  // One album
  if (album) {
    const kind = kindOf(album.type);
    return (
      <View style={styles.container}>
        <View style={styles.albumHeader}>
          <IconButton icon="arrow-left" iconColor={COLORS.text} size={24} onPress={() => { setAlbum(null); setNotice(''); }} accessibilityLabel="Back to albums" />
          <View style={styles.flex}>
            <Text style={styles.albumTitle} numberOfLines={2}>{album.title}</Text>
            <Text style={styles.sub}>{kind.icon} {kind.label} · {resultDate(album.date)} · {photoCount(photos.length || album.photoCount)}</Text>
          </View>
          {isStaff ? (
            <>
              <IconButton icon="pencil" iconColor={COLORS.textLight} size={20} onPress={() => setAlbumForm({ open: true, editing: album })} accessibilityLabel="Edit album" />
              <IconButton icon="delete-outline" iconColor={COLORS.error} size={20} onPress={() => removeAlbum(album)} accessibilityLabel="Remove album" />
            </>
          ) : null}
        </View>
        {isStaff ? (
          <View style={styles.addRow}>
            <Button mode="contained" icon="image-multiple" onPress={() => pick(false)} style={styles.flex}>Choose photos</Button>
            <Button mode="outlined" icon="camera" onPress={() => pick(true)} style={styles.flex}>Take a photo</Button>
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPhotos(album.id); }} tintColor={COLORS.primary} />}
        >
          {messages}
          {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : null}
          {!loading && !photos.length && !error ? (
            <Text style={styles.empty}>{isStaff ? 'No photos yet. Choose some from your phone to start the album.' : 'No photos in this album yet.'}</Text>
          ) : null}
          <View style={styles.tiles}>
            {photos.map((p) => (
              <Pressable key={p.id} onPress={() => setPhoto(p)} accessibilityRole="imagebutton" accessibilityLabel={p.caption || 'Photo'} style={{ width: tile, height: tile }}>
                <Image source={{ uri: p.uri }} style={styles.tileImage} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Portal>
          <Modal visible={!!photo} onDismiss={() => setPhoto(null)} contentContainerStyle={styles.viewer}>
            {photo ? (
              <View>
                <Image source={{ uri: photo.uri }} style={styles.fullPhoto} accessibilityLabel={photo.caption || 'Photo'} />
                <View style={styles.viewerBody}>
                  {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
                  <Text style={styles.viewerMeta}>Added by {photo.uploadedBy}{photo.uploadedAt ? ` · ${resultDate(photo.uploadedAt)}` : ''}</Text>
                  {isStaff ? (
                    <Button mode="outlined" textColor={COLORS.error} style={styles.removeButton} onPress={() => removePhoto(photo)}>Remove photo</Button>
                  ) : (
                    <Text style={styles.viewerMeta}>Want this photo taken down? Ask a club coach or admin and they will remove it.</Text>
                  )}
                </View>
                <IconButton icon="close" size={24} onPress={() => setPhoto(null)} style={styles.close} iconColor="#FFFFFF" accessibilityLabel="Close photo" />
              </View>
            ) : null}
          </Modal>
        </Portal>
        {modals}
      </View>
    );
  }

  // Albums, newest season first
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlbums(); }} tintColor={COLORS.primary} />}
      >
        <Text style={styles.intro}>Photos from match days, training and days out, kept season by season.</Text>
        {messages}
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : null}
        {!loading && !albums.length && !error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No albums yet</Text>
            <Text style={styles.empty}>
              {isStaff ? 'Make an album for a match, a tournament or a day out, then add the photos. Old photos can go in with the date they were taken.' : 'Club staff add albums here. Check back after the next match or day out.'}
            </Text>
          </View>
        ) : null}
        {seasons.map((group) => (
          <View key={group.season} style={styles.season}>
            <Text style={styles.seasonTitle}>{group.season === 'Undated' ? 'Undated' : `${group.season} season`}</Text>
            <View style={styles.albumGrid}>
              {group.albums.map((a) => {
                const kind = kindOf(a.type);
                return (
                  <Pressable key={a.id} onPress={() => { setNotice(''); setAlbum(a); }} accessibilityRole="button" accessibilityLabel={`${a.title}, ${photoCount(a.photoCount)}`} style={[styles.albumCard, { width: width >= 700 ? '48%' : '100%' }]}>
                    {a.coverPhoto ? (
                      <Image source={{ uri: a.coverPhoto }} style={styles.cover} />
                    ) : (
                      <View style={[styles.cover, styles.noCover]}><Text style={styles.noCoverIcon}>{kind.icon}</Text></View>
                    )}
                    <View style={styles.albumInfo}>
                      <Text style={styles.albumCardTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={styles.sub}>{kind.label} · {resultDate(a.date)} · {photoCount(a.photoCount)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      {isStaff ? (
        <FAB icon="plus" label="New album" style={styles.fab} color={COLORS.onPrimary} onPress={() => setAlbumForm({ open: true, editing: null })} />
      ) : null}
      {modals}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 96, gap: 12 },
  intro: { color: c.textLight, fontSize: 14 },
  notice: { color: c.success, fontWeight: '700' },
  error: { color: c.error },
  loading: { marginTop: 24 },
  emptyCard: { padding: 20, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 6 },
  emptyTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
  empty: { color: c.textLight, lineHeight: 20 },
  season: { gap: 10 },
  seasonTitle: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' },
  albumGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  albumCard: { borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden' },
  cover: { width: '100%', height: 180, resizeMode: 'cover' },
  noCover: { backgroundColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  noCoverIcon: { fontSize: 44 },
  albumInfo: { padding: 12, gap: 2 },
  albumCardTitle: { color: c.text, fontWeight: '800', fontSize: 16 },
  sub: { color: c.textLight, fontSize: 12 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: c.primary },
  albumHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, paddingRight: 4, paddingVertical: 6 },
  albumTitle: { fontFamily: FONTS.display, fontSize: 22, letterSpacing: 1, textTransform: 'uppercase', color: c.text },
  addRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 12 },
  grid: { padding: 8, paddingBottom: 40, gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  tileImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: c.surfaceRaised },
  viewer: { backgroundColor: 'rgba(0, 0, 0, 0.95)', margin: 16, borderRadius: 18, overflow: 'hidden', maxHeight: '92%', maxWidth: 900, alignSelf: 'center', width: '94%' },
  fullPhoto: { width: '100%', height: 420, resizeMode: 'contain' },
  viewerBody: { padding: 16, gap: 8 },
  caption: { fontSize: 16, color: '#FFFFFF' },
  viewerMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  removeButton: { borderColor: c.error, alignSelf: 'flex-start' },
  close: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
}));
