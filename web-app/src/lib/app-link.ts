/** The installable web app (people add it to their phone's home screen). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://boost-huddle-app.team-platform-2025.workers.dev').replace(/\/$/, '');

/** Link that opens the app straight on a club, ready to log in or sign up. */
export function clubAppLink(clubSlug: string): string {
  return `${APP_URL}/?club=${encodeURIComponent(clubSlug)}`;
}

/**
 * Where people make an account: the app's sign-up, inside their club, so
 * they get the right role and consent questions. Without a club the app
 * asks them to find it first.
 */
export function appSignUpLink(clubSlug?: string | null): string {
  return clubSlug ? `${APP_URL}/register?club=${encodeURIComponent(clubSlug)}` : `${APP_URL}/find-club`;
}
