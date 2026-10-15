/**
 * Version 1 is match day only (the app's `mobile/src/utils/v1Scope.ts` has the
 * full list). Shelved pages stay and still work, but the website's menus and
 * dashboards don't link to them unless the build sets
 * NEXT_PUBLIC_SHOW_SHELVED=1.
 */

/** Whether shelved features are linked to (from the build). */
export const SHOW_SHELVED = process.env.NEXT_PUBLIC_SHOW_SHELVED === '1' || process.env.NEXT_PUBLIC_SHOW_SHELVED === 'true';

/** Club pages (after `/<club>`) and admin pages (after `/<club>/admin`) that are shelved. */
export const SHELVED_PATHS: ReadonlySet<string> = new Set([
    // Club site (members' "More" menu)
    '/gallery', '/training', '/team', '/calendar', '/history', '/shop', '/friendlies',
    // Club admin
    '/admin/calendar', '/admin/feed', '/admin/gotm', '/admin/lms', '/admin/dues', '/admin/registration', '/admin/shop-settings',
]);

/** Whether a club path is linked to (`/training`, `/admin/gotm`...). */
export function pathShown(path: string, showShelved: boolean = SHOW_SHELVED): boolean {
    return showShelved || !SHELVED_PATHS.has(path);
}
