/**
 * Version 1 is match day only: live match updates and their graphics,
 * fixtures, results, the league table, availability and "I'm at the match",
 * Man of the Match, and player pages and stats. Everything else is shelved:
 * its screens, code and server routes all stay and still work, but nothing in
 * the app links to them. To bring them back, build with
 * EXPO_PUBLIC_SHOW_SHELVED=1 (or take a screen out of SHELVED_SCREENS).
 * No react-native imports, so it can be tested in Node.
 */

/** Screens (navigation names) that nothing links to in version 1. */
export const SHELVED_SCREENS: ReadonlySet<string> = new Set([
  // Training
  'Training', 'DrillLibrary', 'Drill', 'Tactics',
  // Highlights videos and Goal of the Month
  'Videos', 'Highlights', 'MatchHighlights', 'ManageGotm',
  // Predictions
  'LastManStanding', 'ManageLms',
  // Club
  'TeamTalk', 'TeamTalkThread', 'Gallery', 'ClubHistory', 'CreatePost', 'ManageEvents', 'Friendlies',
  // Club extras
  'Shop', 'SigningOn', 'Dues',
  // Match extras
  'Carpool', 'ScoutNotes',
]);

/** Whether shelved features are shown (from the build: EXPO_PUBLIC_SHOW_SHELVED=1). */
export function showsShelved(flag: string | undefined): boolean {
  return flag === '1' || flag === 'true';
}

/** Whether a screen can be linked to, given whether shelved features are shown. */
export function isScreenShown(screen: string, showShelved: boolean): boolean {
  return showShelved || !SHELVED_SCREENS.has(screen);
}
