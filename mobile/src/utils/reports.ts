/** Reasons members pick when reporting something (the server's list). */
export const REPORT_REASONS: Array<{ id: string; label: string }> = [
  { id: 'harassment', label: 'Bullying or harassment' },
  { id: 'inappropriate', label: 'Not suitable' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'violence', label: 'Violence' },
  { id: 'spam', label: 'Spam' },
  { id: 'misinformation', label: 'Not true' },
  { id: 'other', label: 'Something else' },
];

export const REPORT_STATUSES: Array<{ id: string; label: string }> = [
  { id: 'pending', label: 'To review' },
  { id: 'actioned', label: 'Acted on' },
  { id: 'dismissed', label: 'Dismissed' },
];

export type ReportType = 'post' | 'comment' | 'message';

export interface ContentReport {
  id: string;
  content_type: ReportType | string;
  content_id: string;
  reason: string;
  details?: string | null;
  status: string;
  action_taken?: string | null;
  created_at: number;
  content_preview?: string | null;
  content_author?: string | null;
  discussion_id?: string | null;
  reporter_email?: string | null;
}

export const reasonLabel = (id: string): string => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/** What was reported, in words. */
export function reportTypeLabel(type: string): string {
  if (type === 'post') return 'Club post';
  if (type === 'comment') return 'Team Talk comment';
  if (type === 'message') return 'Team Talk conversation';
  return type;
}

/** What staff did about it, in words ("" while waiting). */
export function actionLabel(action?: string | null): string {
  if (action === 'removed') return 'Removed';
  if (action === 'warned') return 'Warned';
  if (action === 'no_action') return 'No action';
  return '';
}
