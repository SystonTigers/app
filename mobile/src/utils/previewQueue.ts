/**
 * Lets a few things load at once and makes the rest wait their turn: used so a
 * page of graphic styles doesn't ask the server to draw every preview at the
 * same moment. No react-native imports (tested in Node).
 */
export interface Slots {
  /** Wait for a free slot; call the returned function once to give it back. */
  take: () => Promise<() => void>;
  /** How many are loading and waiting (for tests) */
  state: () => { busy: number; waiting: number };
}

export function makeSlots(max: number): Slots {
  let busy = 0;
  const waiting: Array<() => void> = [];
  const take = () => new Promise<() => void>((resolve) => {
    const grant = () => {
      busy += 1;
      let given = false;
      resolve(() => {
        if (given) return;
        given = true;
        busy -= 1;
        waiting.shift()?.();
      });
    };
    if (busy < max) grant();
    else waiting.push(grant);
  });
  return { take, state: () => ({ busy, waiting: waiting.length }) };
}

/** Graphic previews: three at a time. */
export const previewSlots = makeSlots(3);
