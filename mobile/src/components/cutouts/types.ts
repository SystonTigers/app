import type { CutoutPlayer } from '../../services/api';

export interface CutoutMakerProps {
  /** The player getting a cut-out; null hides the maker */
  player: CutoutPlayer | null;
  onClose: () => void;
  onSaved: (playerId: string, cutoutUrl: string) => void;
}

/** Whether a file's first bytes are a PNG with see-through pixels (colour type 4 or 6). */
export function looksLikeCutout(head: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return head.length >= 26 && sig.every((b, i) => head[i] === b) && (head[25] === 4 || head[25] === 6);
}

export const NOT_A_CUTOUT = "That PNG still has its background. Choose a photo instead and we'll remove it, or use a PNG with the background already taken out.";
