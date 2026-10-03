/**
 * Choose a badge or logo from the phone. Pictures aren't cropped or turned
 * into JPEGs on the phone, so a PNG keeps its see-through background. On the
 * web a very large picture is shrunk first (keeping PNG as PNG).
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { imageProblem, MAX_BADGE_BYTES } from '../../utils/clubSettings';
import type { PickedImage } from '../../services/clubSettingsApi';

export type PickResult = { image: PickedImage } | { problem: string } | null;

/** Longest side after shrinking: plenty for a badge on a 1080px graphic. */
const MAX_SIDE = 1200;

async function shrinkOnWeb(blob: Blob, type: string): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && blob.size <= MAX_BADGE_BYTES) return blob;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    return out ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Opens the photo library. Null when they cancel. */
export async function pickImage(): Promise<PickResult> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return { problem: 'Allow access to your photos in your phone\'s settings to choose a picture.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = (asset.mimeType || (/\.png$/i.test(asset.uri) ? 'image/png' : 'image/jpeg')).toLowerCase().replace('image/jpg', 'image/jpeg');

  if (Platform.OS === 'web') {
    const typeProblem = imageProblem({ mimeType });
    if (typeProblem) return { problem: typeProblem };
    const original = asset.file ?? (await (await fetch(asset.uri)).blob());
    const blob = await shrinkOnWeb(original, mimeType);
    const sizeProblem = imageProblem({ mimeType, fileSize: blob.size });
    return sizeProblem ? { problem: sizeProblem } : { image: { uri: asset.uri, mimeType, blob } };
  }

  const problem = imageProblem({ mimeType, fileSize: asset.fileSize ?? null });
  return problem ? { problem } : { image: { uri: asset.uri, mimeType } };
}
