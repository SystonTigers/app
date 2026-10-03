import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatShortDate, formatTime, toDate, ukDay } from '../format';
import { brandVars, clubInitials, contrast, parseHex } from '../brand';

describe('format', () => {
  it('writes dates the UK way', () => {
    expect(formatDate('2026-10-04')).toBe('4 Oct 2026');
    expect(formatShortDate('2026-10-03')).toBe('Sat 3 Oct');
    expect(formatDate('2026-10-04', { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('04/10/2026');
  });

  it('reads a plain date as that day', () => {
    expect(toDate('2026-10-04')?.getUTCDate()).toBe(4);
    expect(ukDay('2026-10-04')).toBe('2026-10-04');
    expect(ukDay(new Date(Date.UTC(2026, 9, 3, 23, 30)))).toBe('2026-10-04');
  });

  it('uses the 24-hour clock', () => {
    // 13:05 UTC is 14:05 in the UK in October (BST)
    const d = new Date(Date.UTC(2026, 9, 4, 13, 5));
    expect(formatTime(d)).toBe('14:05');
    expect(formatDateTime(d)).toBe('4 Oct 2026, 14:05');
  });

  it('returns an empty string for missing or bad values', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
});

describe('brand', () => {
  it('keeps a readable club colour', () => {
    expect(brandVars('#D72638').brand).toBe('#d72638');
  });

  it('lightens a very dark club colour so it reads on the dark background', () => {
    const v = brandVars('#001133');
    const rgb = v.brandRgb.split(' ').map(Number) as [number, number, number];
    expect(contrast(rgb, [11, 13, 15])).toBeGreaterThanOrEqual(3);
  });

  it('falls back to the Boost Huddle cyan', () => {
    expect(brandVars(null).brand).toBe('#00ffff');
    expect(brandVars('red').brand).toBe('#00ffff');
    expect(parseHex('#abc')).toEqual([170, 187, 204]);
  });

  it('picks dark text on light colours and white on deep ones', () => {
    expect(brandVars('#FFD400').onBrandRgb).toBe('6 8 11');
    expect(brandVars('#7A1020').onBrandRgb).toBe('255 255 255');
  });

  it('makes initials for a badge placeholder', () => {
    expect(clubInitials('Riverside Rovers')).toBe('RR');
    expect(clubInitials('Syston Town FC')).toBe('ST');
    expect(clubInitials('Wigston')).toBe('W');
  });
});
