/** Subs and fees: money in pounds, as the server sends it. */
export interface PaymentRequest {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  dueDate: number | null; // seconds
  status: string;
  paidCount: number;
  totalCollected: number;
  createdAt: number;
}

export const pounds = (n: number): string => `£${(Math.round(n * 100) / 100).toFixed(2)}`;

/** "25", "£25", "25.5" → 25.5; anything else (or not more than 0) → null. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[£,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 && n <= 10000 ? n : null;
}

/** "31/03/2026" or "2026-03-31" → "2026-03-31"; blank → ""; anything else → null. */
export function parseDueDate(text: string): string | null {
  const t = text.trim();
  if (!t) return '';
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; } else if (uk) { d = +uk[1]; m = +uk[2]; y = +uk[3]; } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
