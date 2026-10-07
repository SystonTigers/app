/**
 * Web addresses for every screen. On the web app this gives each page its own
 * address in the browser history, so the phone's back gesture or button goes
 * to the previous page instead of closing the app. Native apps use the
 * drawer's own history (backBehavior="history" in App.tsx).
 */
import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

const DRAWER_PATHS: Record<string, string> = {
  LiveMatch: 'live',
  MOTMVoting: 'man-of-the-match',
  LastManStanding: 'predictions',
  Training: 'training',
  DrillLibrary: 'drills',
  Drill: 'drills/drill',
  Player: 'players/player',
  Stats: 'stats',
  Results: 'results',
  LeagueTable: 'table',
  TeamMembers: 'people',
  Shop: 'shop',
  ManageSquad: 'manage/squad',
  ManageFixtures: 'manage/fixtures',
  ManageEvents: 'manage/events',
  MatchCentre: 'match-centre',
  ManageMOTM: 'manage/man-of-the-match',
  Opponents: 'manage/opponents',
  ManageGotm: 'manage/goal-of-the-month',
  ManageSeasons: 'manage/seasons',
  Reports: 'manage/reports',
  MatchReport: 'manage/match-report',
  Friendlies: 'manage/friendlies',
  ManageLms: 'manage/last-man-standing',
  Dues: 'manage/subs',
  ManagePlayerImages: 'manage/player-images',
  PlayerCutouts: 'manage/player-cutouts',
  ClubSettings: 'manage/club-settings',
  PushNotificationsSetup: 'manage/notifications',
  Profile: 'profile',
  MediaConsent: 'consent',
  SigningOn: 'signing-on',
  Settings: 'settings',
  CreatePost: 'new-post',
  Gallery: 'gallery',
  ClubHistory: 'history',
  Tactics: 'tactics',
  TeamTalk: 'team-talk',
  TeamTalkThread: 'team-talk/conversation',
  Highlights: 'highlights',
  MatchHighlights: 'highlights/match',
  Manage: 'manage',
  ImportData: 'manage/import',
  ScoutNotes: 'scout',
  Carpool: 'carpool',
  Onboarding: 'welcome',
};

// Typed loosely: the screens are spread over the sign-in stack, the menu and the tabs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const linking: LinkingOptions<any> | undefined =
  Platform.OS === 'web'
    ? {
        prefixes: [],
        config: {
          screens: {
            // Signed out
            FindClub: 'find-club',
            Login: 'login',
            Register: 'register',
            ForgotPassword: 'forgot-password',
            // Signed in: the bottom tabs, then everything in the menu
            TabNavigator: {
              path: '',
              screens: { Dashboard: '', Matches: 'matches', Squad: 'squad', Videos: 'videos' },
            },
            ...DRAWER_PATHS,
          },
        },
      }
    : undefined;
