/**
 * Share a post's graphic (drawn by the server) through the phone's share menu,
 * e.g. to TikTok or WhatsApp. Web app only; elsewhere the picture is saved.
 */
import type { SocialPost } from './liveMatch';

export type ShareOutcome = 'shared' | 'downloaded' | 'not_ready' | 'unavailable';

export async function shareGraphic(post: SocialPost): Promise<ShareOutcome> {
  if (!post.imageUrl) return 'not_ready';
  if (typeof document === 'undefined' || typeof fetch !== 'function') return 'unavailable';
  let jpeg: Blob;
  try {
    const res = await fetch(post.imageUrl);
    if (!res.ok) return 'unavailable';
    jpeg = await res.blob();
  } catch {
    return 'unavailable';
  }
  const file = new File([jpeg], `${post.kind}.jpg`, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: post.caption });
    } catch {
      // Closed the share menu: nothing to do
    }
    return 'shared';
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
