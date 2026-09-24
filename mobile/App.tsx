import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ClubProvider, useClub } from './src/context/ClubContext';
import { usersApi } from './src/services/api';
import { fetchClubInfo } from './src/services/club';
import { registerForPushAfterSignIn } from './src/services/push';
import { COLORS } from './src/config';
import { ErrorBoundary } from './src/ErrorBoundary';
import { initCrashReporting } from './src/services/crashReporting';

// Start crash reporting before anything renders (no-op without EXPO_PUBLIC_SENTRY_DSN)
initCrashReporting();

// Build a react-native-paper theme from our design tokens
const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.text,
    onBackground: COLORS.text,
    border: '#2F3439',
    text: COLORS.text,
    textSecondary: COLORS.textLight,
  },
};

import CustomDrawerContent from './src/components/CustomDrawerContent';

// Screen Imports
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import VideoScreen from './src/screens/VideoScreen';
import ChatScreen from './src/screens/ChatScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import AutoPostsMatrixScreen from './src/screens/AutoPostsMatrixScreen';
import LiveMatchInputScreen from './src/screens/LiveMatchInputScreen';
import LiveMatchWatchScreen from './src/screens/LiveMatchWatchScreen';
import MOTMVotingScreen from './src/screens/MOTMVotingScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import HighlightsScreen from './src/screens/HighlightsScreen';
import TrainingScreen from './src/screens/TrainingScreen';
import DrillLibraryScreen from './src/screens/DrillLibraryScreen';
import StatsScreen from './src/screens/StatsScreen';
import LeagueTableScreen from './src/screens/LeagueTableScreen';
import WearablesScreen from './src/screens/WearablesScreen';
import ShopScreen from './src/screens/ShopScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import LastManStandingScreen from './src/screens/LastManStandingScreen';
import TeamMembersScreen from './src/screens/TeamMembersScreen';
import ManageScreen from './src/screens/ManageScreen';
import ManageUsersScreen from './src/screens/ManageUsersScreen';
import ManageSquadScreen from './src/screens/ManageSquadScreen';
import ManageFixturesScreen from './src/screens/ManageFixturesScreen';
import ManageEventsScreen from './src/screens/ManageEventsScreen';
import ManageMOTMScreen from './src/screens/ManageMOTMScreen';
import ManagePlayerImagesScreen from './src/screens/ManagePlayerImagesScreen';
import ImportDataScreen from './src/screens/ImportDataScreen';
import FixtureSettingsScreen from './src/screens/FixtureSettingsScreen';
import PushNotificationsSetupScreen from './src/screens/PushNotificationsSetupScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import ScoutNotesScreen from './src/screens/ScoutNotesScreen';
import CarpoolScreen from './src/screens/CarpoolScreen';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FindClubScreen from './src/screens/FindClubScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: '#2F3439',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Videos"
        component={VideoScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="video" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
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
  return (
    <Drawer.Navigator
      initialRouteName="TabNavigator"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: paperTheme.colors.background,
          borderBottomColor: paperTheme.colors.border,
          borderBottomWidth: 1,
          shadowColor: 'transparent',
        },
        headerTintColor: paperTheme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: paperTheme.colors.background,
          width: '80%',
        },
        drawerActiveTintColor: paperTheme.colors.primary,
        drawerInactiveTintColor: paperTheme.colors.textSecondary,
      }}
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
      <Drawer.Screen name="LiveMatchInput" component={LiveMatchInputScreen} options={{ title: 'Live Console' }} />
      <Drawer.Screen name="LiveMatchWatch" component={LiveMatchWatchScreen} options={{ title: 'Match Centre' }} />
      <Drawer.Screen name="MOTMVoting" component={MOTMVotingScreen} options={{ title: 'Vote for MOTM' }} />
      <Drawer.Screen name="LastManStanding" component={LastManStandingScreen} options={{ title: 'Predictions' }} />

      {/* Training Group */}
      <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: 'Training Centre' }} />
      <Drawer.Screen name="DrillLibrary" component={DrillLibraryScreen} options={{ title: 'Drill Library' }} />
      <Drawer.Screen name="Stats" component={StatsScreen} options={{ title: 'Statistics' }} />
      <Drawer.Screen name="LeagueTable" component={LeagueTableScreen} options={{ title: 'League Table' }} />
      <Drawer.Screen name="Wearables" component={WearablesScreen} options={{ title: 'Wearables' }} />

      {/* My Club Group */}
      <Drawer.Screen name="TeamMembers" component={TeamMembersScreen} options={{ title: 'Team Members' }} />
      <Drawer.Screen name="Shop" component={ShopScreen} options={{ title: 'Club Shop' }} />
      <Drawer.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
      {/* <Drawer.Screen name="Documents" component={DocumentsScreen} /> */}

      {/* Admin Zone Group */}
      <Drawer.Screen name="ManageSquad" component={ManageSquadScreen} options={{ title: 'Manage Squad' }} />
      <Drawer.Screen name="ManageFixtures" component={ManageFixturesScreen} options={{ title: 'Manage Fixtures' }} />
      <Drawer.Screen name="ManageEvents" component={ManageEventsScreen} options={{ title: 'Manage Events' }} />
      <Drawer.Screen name="ManageMOTM" component={ManageMOTMScreen} options={{ title: 'Manage MOTM' }} />
      <Drawer.Screen name="ManagePlayerImages" component={ManagePlayerImagesScreen} options={{ title: 'Player Images' }} />
      <Drawer.Screen
        name="PushNotificationsSetup"
        options={{ title: 'Push Notifications' }}
        children={({ navigation }: any) => (
          <PushNotificationsSetupScreen
            onComplete={() => navigation.goBack()}
            onSkip={() => navigation.goBack()}
          />
        )}
      />
      <Drawer.Screen name="AutoPostsMatrix" component={AutoPostsMatrixScreen} options={{ title: 'Auto Posts' }} />

      {/* Settings Group */}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen name="Config" component={ConfigScreen} options={{ title: 'System Config' }} />

      {/* Other/Hidden Screens */}
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="CreatePost" component={CreatePostScreen} />
      <Drawer.Screen name="Gallery" component={GalleryScreen} />
      <Drawer.Screen name="Highlights" component={HighlightsScreen} />
      <Drawer.Screen name="Manage" component={ManageScreen} />
      <Drawer.Screen name="ManageUsers" component={ManageUsersScreen} />
      <Drawer.Screen name="ImportData" component={ImportDataScreen} />
      <Drawer.Screen name="FixtureSettings" component={FixtureSettingsScreen} />
      <Drawer.Screen name="ScoutNotes" component={ScoutNotesScreen} options={{ title: 'Scout Report' }} />
      <Drawer.Screen name="Carpool" component={CarpoolScreen} options={{ title: 'Carpool' }} />

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
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
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

  if (authLoading || clubLoading) return <Splash />;
  if (!isAuthenticated) return <AuthNavigator />;
  if (!club && !isLocked) return <Splash />;
  return <MainDrawer />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <ClubProvider>
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
    </ClubProvider>
    </ErrorBoundary>
  );
}
