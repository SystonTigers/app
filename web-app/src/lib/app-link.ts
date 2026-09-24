/** The installable web app (people add it to their phone's home screen). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://boost-huddle-app.team-platform-2025.workers.dev').replace(/\/$/, '');

/** Link that opens the app straight on a club, ready to log in or sign up. */
export function clubAppLink(clubSlug: string): string {
  return `${APP_URL}/?club=${encodeURIComponent(clubSlug)}`;
}
