/**
 * Turns a picked photo into a JPEG ready to upload. On the web the picture is
 * shrunk on the phone first (a 12-megapixel photo becomes a few hundred KB),
 * which keeps uploads quick on a touchline signal.
 */
import { Platform } from 'react-native';
import { fitWithin } from '../utils/fixturePhoto';

export async function photoBlob(uri: string): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return (await fetch(uri)).blob();
  }
  const img = new Image();
  img.decoding = 'async';
  img.src = uri;
  await img.decode();
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return (await fetch(uri)).blob();
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob ?? (await fetch(uri)).blob();
}
