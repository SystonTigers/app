import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ClubProvider, useClub } from './src/context/ClubContext';
import { MatchDayProvider } from './src/context/MatchDayContext';
import MatchDayHost from './src/components/live/MatchDayHost';
import HeaderLeft from './src/navigation/HeaderLeft';
import { linking } from './src/navigation/linking';
import { navigationRef } from './src/navigation/navigationRef';
import { usersApi } from './src/services/api';
import { fetchClubInfo } from './src/services/club';
import { registerForPushAfterSignIn } from './src/services/push';
import { COLORS } from './src/config';
import { ErrorBoundary } from './src/ErrorBoundary';
import { initCrashReporting } from './src/services/crashReporting';

// Start crash reporting before anything renders (no-op without EXPO_PUBLIC_SENTRY_DSN)
initCrashReporting();


import CustomDrawerContent from './src/components/CustomDrawerContent';

// Screen Imports
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import MOTMVotingScreen from './src/screens/MOTMVotingScreen';
import LiveMatchWatchScreen from './src/screens/LiveMatchWatchScreen';
import LiveMatchInputScreen from './src/screens/LiveMatchInputScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import TeamTalkScreen from './src/screens/TeamTalkScreen';
import ClubHistoryScreen from './src/screens/ClubHistoryScreen';
import TacticsScreen from './src/screens/TacticsScreen';
import TeamTalkThreadScreen from './src/screens/TeamTalkThreadScreen';
import HighlightsScreen from './src/screens/HighlightsScreen';
import MatchHighlightsScreen from './src/screens/MatchHighlightsScreen';
import MediaConsentScreen from './src/screens/MediaConsentScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import DrillLibraryScreen from './src/screens/DrillLibraryScreen';
import DrillScreen from './src/screens/DrillScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import StatsScreen from './src/screens/StatsScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import LeagueTableScreen from './src/screens/LeagueTableScreen';
import ShopScreen from './src/screens/ShopScreen';
import LastManStandingScreen from './src/screens/LastManStandingScreen';
import TeamMembersScreen from './src/screens/TeamMembersScreen';
import ManageScreen from './src/screens/ManageScreen';
import ManageSquadScreen from './src/screens/ManageSquadScreen';
import ManageFixturesScreen from './src/screens/ManageFixturesScreen';
import ManageEventsScreen from './src/screens/ManageEventsScreen';
import ManageMOTMScreen from './src/screens/ManageMOTMScreen';
import OpponentsScreen from './src/screens/OpponentsScreen';
import ManageGotmScreen from './src/screens/ManageGotmScreen';
import ManageSeasonsScreen from './src/screens/ManageSeasonsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import MatchReportScreen from './src/screens/MatchReportScreen';
import FriendliesScreen from './src/screens/FriendliesScreen';
import ManageLmsScreen from './src/screens/ManageLmsScreen';
import DuesScreen from './src/screens/DuesScreen';
import ManagePlayerImagesScreen from './src/screens/ManagePlayerImagesScreen';
import ClubSettingsScreen from './src/screens/ClubSettingsScreen';
import ImportDataScreen from './src/screens/ImportDataScreen';
import PushNotificationsSetupScreen from './src/screens/PushNotificationsSetupScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ScoutNotesScreen from './src/screens/ScoutNotesScreen';
import CarpoolScreen from './src/screens/CarpoolScreen';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FindClubScreen from './src/screens/FindClubScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { captureInviteFromLink } from './src/services/inviteLink';
import { staffScreen } from './src/components/StaffOnly';
import BrandSplash from './src/components/brand/BrandSplash';
import WaitingForApprovalScreen from './src/screens/WaitingForApprovalScreen';
import { useBrandFonts } from './src/theme/brandFonts';
import { useTheme } from './src/theme/useTheme';
import { INK, TEXT, TEXT_MUTED, useBrandColors } from './src/theme/brand';
import { buildPaperTheme } from './src/theme/paperTheme';
import { FONTS } from './src/theme/brandFonts';

// A parent opened the manager's invite link: keep the code until they're signed in
captureInviteFromLink();

// Staff pages: other members who open one by its address see "This is for club staff"
const StaffTeamMembers = staffScreen(TeamMembersScreen);
const StaffManageSquad = staffScreen(ManageSquadScreen);
const StaffManageFixtures = staffScreen(ManageFixturesScreen);
const StaffManageEvents = staffScreen(ManageEventsScreen);
const StaffMatchCentre = staffScreen(LiveMatchInputScreen);
const StaffManageMOTM = staffScreen(ManageMOTMScreen);
const StaffOpponents = staffScreen(OpponentsScreen);
const StaffManageGotm = staffScreen(ManageGotmScreen);
const StaffManageSeasons = staffScreen(ManageSeasonsScreen);
const StaffReports = staffScreen(ReportsScreen);
const StaffMatchReport = staffScreen(MatchReportScreen);
const StaffFriendlies = staffScreen(FriendliesScreen);
const StaffManageLms = staffScreen(ManageLmsScreen);
const StaffDues = staffScreen(DuesScreen);
const StaffManagePlayerImages = staffScreen(ManagePlayerImagesScreen);
const StaffClubSettings = staffScreen(ClubSettingsScreen);
const AdminPushNotificationsSetup = staffScreen(PushNotificationsSetupScreen, 'admin');
const StaffCreatePost = staffScreen(CreatePostScreen);
const StaffManage = staffScreen(ManageScreen);
const StaffImportData = staffScreen(ImportDataScreen);
const StaffScoutNotes = staffScreen(ScoutNotesScreen);

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B0E12',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'rgba(242,245,247,0.5)',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={FixturesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Squad"
        component={SquadScreen}
        options={{
          title: 'Players',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Videos"
        children={() => <HighlightsScreen inTab />}
        options={{
          tabBarLabel: 'Highlights',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="play-box-multiple" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Splash() {
  const { club } = useClub();
  return <BrandSplash clubName={club?.name} />;
}

/** Signed-out screens: find your club, then log in or create an account. */
function AuthNavigator() {
  const { club } = useClub();
  const { signIn } = useAuth();

  return (
    <AuthStack.Navigator initialRouteName={club ? 'Login' : 'FindClub'} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="FindClub">
        {({ navigation }: any) => (
          <FindClubScreen
            onClubChosen={() => navigation.navigate('Login')}
            onLogIn={() => navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Login">
        {({ navigation }: any) => (
          <LoginScreen
            onLogin={signIn}
            onNavigateToRegister={() => navigation.navigate(club ? 'Register' : 'FindClub')}
            onForgotPassword={() => navigation.navigate('ForgotPassword')}
            onSwitchClub={() => navigation.navigate('FindClub')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {({ navigation }: any) => (
          <RegisterScreen onRegister={signIn} onNavigateToLogin={() => navigation.navigate('Login')} />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="ForgotPassword">
        {({ navigation }: any) => <ForgotPasswordScreen onBack={() => navigation.goBack()} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

/** The signed-in app. */
function MainDrawer() {
  const accent = useBrandColors().primary;
  return (
    <Drawer.Navigator
      initialRouteName="TabNavigator"
      // Back (gesture, button or browser) returns to the previous page, not always Home
      backBehavior="history"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerLeft: ({ tintColor }: { tintColor?: string }) => <HeaderLeft navigation={navigation} tintColor={tintColor} />,
        headerStyle: {
          backgroundColor: INK,
          borderBottomColor: 'rgba(255,255,255,0.08)',
          borderBottomWidth: 1,
          shadowColor: 'transparent',
        },
        headerTintColor: TEXT,
        headerTitleStyle: {
          fontFamily: FONTS.display,
          fontSize: 22,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        drawerStyle: {
          backgroundColor: '#07090C',
          width: '80%',
        },
        drawerActiveTintColor: accent,
        drawerInactiveTintColor: TEXT_MUTED,
      })}
    >
      {/* Main Tab App */}
      <Drawer.Screen
        name="TabNavigator"
        component={TabNavigator}
        options={{
          headerShown: false,
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Match Day Group */}
      <Drawer.Screen name="LiveMatch" component={LiveMatchWatchScreen} options={{ title: 'Live Match' }} />
      <Drawer.Screen name="MOTMVoting" component={MOTMVotingScreen} options={{ title: 'Man of the Match' }} />
      <Drawer.Screen name="LastManStanding" component={LastManStandingScreen} options={{ title: 'Predictions' }} />

      {/* Training Group */}
      <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: 'Training Centre' }} />
      <Drawer.Screen name="DrillLibrary" component={DrillLibraryScreen} options={{ title: 'Drill Library' }} />
      <Drawer.Screen name="Drill" component={DrillScreen} options={{ title: 'Drill' }} />
      <Drawer.Screen name="Player" component={PlayerScreen} options={{ title: 'Player' }} />
      <Drawer.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
      <Drawer.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
      <Drawer.Screen name="ClubHistory" component={ClubHistoryScreen} options={{ title: 'Club history' }} />
      <Drawer.Screen name="Tactics" component={TacticsScreen} options={{ title: 'Tactics' }} />
      <Drawer.Screen name="LeagueTable" component={LeagueTableScreen} options={{ title: 'League Table' }} />

      {/* My Club Group */}
      <Drawer.Screen name="TeamMembers" component={StaffTeamMembers} options={{ title: 'People & Roles' }} />
      <Drawer.Screen name="Shop" component={ShopScreen} options={{ title: 'Club Shop' }} />

      {/* Admin Zone Group */}
      <Drawer.Screen name="ManageSquad" component={StaffManageSquad} options={{ title: 'Manage Squad' }} />
      <Drawer.Screen name="ManageFixtures" component={StaffManageFixtures} options={{ title: 'Manage Fixtures' }} />
      <Drawer.Screen name="ManageEvents" component={StaffManageEvents} options={{ title: 'Manage Events' }} />
      <Drawer.Screen name="MatchCentre" component={StaffMatchCentre} options={{ title: 'Match Centre' }} />
      <Drawer.Screen name="ManageMOTM" component={StaffManageMOTM} options={{ title: 'Manage MOTM' }} />
      <Drawer.Screen name="Opponents" component={StaffOpponents} options={{ title: 'Opponents' }} />
      <Drawer.Screen name="ManageGotm" component={StaffManageGotm} options={{ title: 'Goal of the Month' }} />
      <Drawer.Screen name="ManageSeasons" component={StaffManageSeasons} options={{ title: 'Seasons' }} />
      <Drawer.Screen name="Reports" component={StaffReports} options={{ title: 'Reports' }} />
      <Drawer.Screen name="MatchReport" component={StaffMatchReport} options={{ title: 'Match report' }} />
      <Drawer.Screen name="Friendlies" component={StaffFriendlies} options={{ title: 'Friendlies' }} />
      <Drawer.Screen name="ManageLms" component={StaffManageLms} options={{ title: 'Last Man Standing' }} />
      <Drawer.Screen name="Dues" component={StaffDues} options={{ title: 'Subs and fees' }} />
      <Drawer.Screen name="ManagePlayerImages" component={StaffManagePlayerImages} options={{ title: 'Player Images' }} />
      <Drawer.Screen name="ClubSettings" component={StaffClubSettings} options={{ title: 'Club Settings' }} />
      <Drawer.Screen
        name="PushNotificationsSetup"
        options={{ title: 'Push Notifications' }}
        children={({ navigation }: any) => (
          <AdminPushNotificationsSetup
            onComplete={() => navigation.goBack()}
            onSkip={() => navigation.goBack()}
          />
        )}
      />

      {/* Settings Group */}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Drawer.Screen name="MediaConsent" component={MediaConsentScreen} options={{ title: 'Photo & Video Consent' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />

      {/* Other/Hidden Screens */}
      <Drawer.Screen name="CreatePost" component={StaffCreatePost} options={{ title: 'New club post' }} />
      <Drawer.Screen name="Gallery" component={GalleryScreen} options={{ title: 'Gallery' }} />
      <Drawer.Screen name="TeamTalk" component={TeamTalkScreen} options={{ title: 'Team Talk' }} />
      <Drawer.Screen name="TeamTalkThread" component={TeamTalkThreadScreen} options={{ title: 'Conversation' }} />
      <Drawer.Screen name="Highlights" component={HighlightsScreen} />
      <Drawer.Screen name="MatchHighlights" component={MatchHighlightsScreen} options={{ title: 'Match Highlights' }} />
      <Drawer.Screen name="Manage" component={StaffManage} options={{ title: 'Team Admin' }} />
      <Drawer.Screen name="ImportData" component={StaffImportData} options={{ title: 'Import data' }} />
      <Drawer.Screen name="ScoutNotes" component={StaffScoutNotes} options={{ title: 'Scout Report' }} />
      <Drawer.Screen name="Carpool" component={CarpoolScreen} options={{ title: 'Lift sharing' }} />

      <Drawer.Screen
        name="Onboarding"
        options={{ headerShown: false }}
        children={({ navigation }: any) => (
          <OnboardingScreen
            onComplete={() => navigation.navigate('TabNavigator')}
          />
        )}
      />

    </Drawer.Navigator>
  );
}

function RootNavigator() {
  const fontsReady = useBrandFonts();
  // Show the launch screen for a moment on a cold start, even when everything loads instantly
  const [splashShown, setSplashShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashShown(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const { isAuthenticated, isLoading: authLoading, logout, waiting } = useAuth();
  const { club, isLoading: clubLoading, isLocked, chooseClub } = useClub();

  // Signed in from an older version that didn't remember the club: ask the server which club the account is in
  useEffect(() => {
    if (authLoading || clubLoading || !isAuthenticated || club || isLocked) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await usersApi.getProfile();
        const found = me?.user?.tenant_slug ? await fetchClubInfo(me.user.tenant_slug) : null;
        if (cancelled) return;
        if (found) {
          await chooseClub(found);
        } else {
          await logout();
        }
      } catch {
        if (!cancelled) await logout();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, clubLoading, isAuthenticated, club, isLocked, chooseClub, logout]);

  // Match updates: register this phone for the club's notifications once signed in
  const readyClub = club?.slug;
  useEffect(() => {
    if (isAuthenticated && readyClub) {
      registerForPushAfterSignIn();
    }
  }, [isAuthenticated, readyClub]);

  if (authLoading || clubLoading || !fontsReady || !splashShown) return <Splash />;
  if (!isAuthenticated) return <AuthNavigator />;
  if (!club && !isLocked) return <Splash />;
  // New sign-ups wait until the club's coaches let them in
  if (waiting) return <WaitingForApprovalScreen />;
  return (
    <MatchDayProvider>
      <MainDrawer />
      {/* Match days: live video pop-up, "at the ground?" check, alert taps */}
      <MatchDayHost />
    </MatchDayProvider>
  );
}

/** Paper components in the club's colour (inside ThemeProvider, which knows the club). */
function BrandPaper({ children }: { children: React.ReactNode }) {
  const c = useBrandColors();
  const theme = React.useMemo(() => buildPaperTheme(c), [c]);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <ClubProvider>
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <BrandPaper>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </BrandPaper>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
    </ClubProvider>
    </ErrorBoundary>
  );
}
