/** Home screen helpers. No react-native imports (tested in Node). */

/** "Riverside Rovers U16" → "RR" (skips age groups and common words). */
export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w && !/^(u\d+s?|fc|afc|the|and|of|jfc|jnr|juniors?)$/i.test(w));
  const picked = words.length ? words : name.split(/\s+/);
  return picked.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

/** "TODAY", "TOMORROW", "IN 3 DAYS", "SAT 4 OCT" for a yyyy-mm-dd date (UK time). */
export function countdownLabel(date: string, now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
  const days = Math.round((Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) - Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))) / 86_400_000);
  if (!Number.isFinite(days)) return '';
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  if (days > 1 && days <= 6) return `IN ${days} DAYS`;
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase();
}

/** 1 → "1ST", 2 → "2ND", 11 → "11TH", 23 → "23RD" */
export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' } as Record<number, string>)[n % 10] ?? 'TH';
  return `${n}${s}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" (UK time). */
export function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(now));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
