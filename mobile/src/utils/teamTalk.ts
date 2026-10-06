/**
 * Team talk (club conversations) helpers. No react-native imports
 * (node test/teamTalk.test.js). Same rules as the website.
 */

export const CATEGORY_LABEL: Record<string, string> = { general: 'General', 'match-analysis': 'Match chat', training: 'Training', tactics: 'Tactics' };
/** Players and parents only see these two (the server enforces it too). */
export const MEMBER_CATEGORIES = ['general', 'match-analysis'];
export const STAFF_CATEGORIES = ['general', 'match-analysis', 'training', 'tactics'];

export interface DiscussionSummary {
  id: string; category: string; title: string; author_name: string;
  pinned: boolean; locked: boolean; created_at: number; updated_at: number; comment_count: number;
}

export interface TalkComment {
  id: string; author_id?: string; author_name: string; content: string; video_timestamp: number | null; created_at: number; replies?: TalkComment[];
}

export interface Discussion {
  id: string; category: string; title: string; author_id: string; author_name: string;
  video_id: string | null; pinned: boolean; locked: boolean; created_at: number; comments: TalkComment[];
}

export type Part = { type: 'text'; value: string } | { type: 'time'; display: string; seconds: number };

/** Splits "[12:34]" and "[1:23:45]" video times out of a comment, as the website does. */
export function splitTimes(text: string): Part[] {
  const parts: Part[] = [];
  const re = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    parts.push({ type: 'time', display: m[0], seconds });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

/** A video link that opens at a moment (YouTube gets ?t=, others are left as they are). */
export function videoAt(url: string, seconds: number): string {
  if (!/youtu\.?be/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${Math.max(0, Math.floor(seconds))}`;
}

/** The "@na" being typed at the end of a comment, or null. */
export function mentionQuery(text: string): string | null {
  const m = /(?:^|\s)@([A-Za-z][\w'-]{0,30})$/.exec(text);
  return m ? m[1] : null;
}

/** Replaces the "@na" being typed with "@Full Name ". */
export function insertMention(text: string, name: string): string {
  return text.replace(/@([A-Za-z][\w'-]{0,30})$/, `@${name} `);
}

/** "2 replies" */
export function repliesText(n: number): string {
  return `${n} ${n === 1 ? 'reply' : 'replies'}`;
}

/** "6 Oct, 14:05" from seconds or milliseconds since 1970. */
export function talkTime(t: number): string {
  const ms = t < 1e12 ? t * 1000 : t;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}
