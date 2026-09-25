/**
 * Draw a post's graphic on this phone and send it to the server, or share it
 * (e.g. to TikTok) through the phone's share menu. Web app only.
 */
import { socialApi } from '../services/api';
import type { SocialPost } from './liveMatch';
import { canDrawGraphics, renderGraphic } from './socialGraphic';

/** Returns true if the graphic was sent. Never throws: the post still goes out as text. */
export async function sendGraphic(post: SocialPost | null | undefined): Promise<boolean> {
  if (!post || post.hasImage || !canDrawGraphics()) return false;
  try {
    const jpeg = await renderGraphic(post.graphic);
    if (!jpeg) return false;
    await socialApi.uploadGraphic(post.id, jpeg);
    return true;
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'downloaded' | 'unavailable';

/**
 * Open the share menu with the graphic and caption (to post to TikTok,
 * WhatsApp and so on). Where sharing files isn't supported, save the image.
 */
export async function shareGraphic(post: SocialPost): Promise<ShareOutcome> {
  if (!canDrawGraphics()) return 'unavailable';
  const jpeg = await renderGraphic(post.graphic);
  if (!jpeg) return 'unavailable';
  const file = new File([jpeg], `${post.kind}.jpg`, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: post.caption });
      return 'shared';
    } catch {
      // Closed the share menu: nothing to do
      return 'shared';
    }
  }
  const url = URL.createObjectURL(jpeg);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
