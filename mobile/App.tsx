import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './src/config';
import { AuthProvider } from './src/context/AuthContext';

// Main Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import VideoScreen from './src/screens/VideoScreen';

// Auth & Profile Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Settings & Config
import SettingsScreen from './src/screens/SettingsScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import PushNotificationsSetupScreen from './src/screens/PushNotificationsSetupScreen';

// Social & Communication
import ChatScreen from './src/screens/ChatScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import AutoPostsMatrixScreen from './src/screens/AutoPostsMatrixScreen';

// Live Match Features
import LiveMatchInputScreen from './src/screens/LiveMatchInputScreen';
import LiveMatchWatchScreen from './src/screens/LiveMatchWatchScreen';
import MOTMVotingScreen from './src/screens/MOTMVotingScreen';

// Media & Content
import GalleryScreen from './src/screens/GalleryScreen';
import HighlightsScreen from './src/screens/HighlightsScreen';

// Training & Development
import TrainingScreen from './src/screens/TrainingScreen';
import DrillLibraryScreen from './src/screens/DrillLibraryScreen';

// Stats & Analytics
import StatsScreen from './src/screens/StatsScreen';
import LeagueTableScreen from './src/screens/LeagueTableScreen';

// Shop & Commerce
import ShopScreen from './src/screens/ShopScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';

// Team Management
import TeamMembersScreen from './src/screens/TeamMembersScreen';
import ManageScreen from './src/screens/ManageScreen';
import ManageUsersScreen from './src/screens/ManageUsersScreen';
import ManageSquadScreen from './src/screens/ManageSquadScreen';
import ManageFixturesScreen from './src/screens/ManageFixturesScreen';
import ManageEventsScreen from './src/screens/ManageEventsScreen';
import ManageMOTMScreen from './src/screens/ManageMOTMScreen';
import ManagePlayerImagesScreen from './src/screens/ManagePlayerImagesScreen';
import FixtureSettingsScreen from './src/screens/FixtureSettingsScreen';

// Onboarding
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Customize theme with Syston Tigers colors
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
  },
};

// Bottom Tab Navigator Component
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.background,
        },
        headerShown: false, // Hide tab headers since drawer will show them
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Fixtures"
        component={FixturesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="soccer" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Squad"
        component={SquadScreen}
        options={{
          tabBarIcon: ({ color, size}) => (
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

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <StatusBar style="auto" />
          <Drawer.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: COLORS.secondary,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              drawerStyle: {
                backgroundColor: COLORS.surface,
              },
              drawerActiveTintColor: COLORS.primary,
              drawerInactiveTintColor: COLORS.textLight,
            }}
          >
            {/* Main Navigation */}
            <Drawer.Screen
              name="Main"
              component={TabNavigator}
              options={{
                title: 'Syston Tigers',
                drawerLabel: 'Home',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="home" size={size} color={color} />
                ),
              }}
            />

            {/* Profile & Auth */}
            <Drawer.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                title: 'Profile',
                drawerLabel: 'Profile',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="Login"
              component={LoginScreen}
              options={{
                title: 'Login',
                drawerLabel: 'Login',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="login" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                title: 'Register',
                drawerLabel: 'Register',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account-plus" size={size} color={color} />
                ),
              }}
            />

            {/* Team & Players - Hidden due to useTheme hook issue */}
            <Drawer.Screen
              name="TeamMembers"
              component={TeamMembersScreen}
              options={{
                drawerItemStyle: { display: 'none' }
              }}
            />

            {/* Live Match */}
            <Drawer.Screen
              name="LiveMatchWatch"
              component={LiveMatchWatchScreen}
              options={{
                title: 'Watch Live Match',
                drawerLabel: 'Watch Live Match',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="eye" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="LiveMatchInput"
              component={LiveMatchInputScreen}
              options={{
                title: 'Live Match Input',
                drawerLabel: 'Live Match Input',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="scoreboard" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="MOTMVoting"
              component={MOTMVotingScreen}
              options={{
                title: 'MOTM Voting',
                drawerLabel: 'MOTM Voting',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="star" size={size} color={color} />
                ),
              }}
            />

            {/* Stats & Analytics */}
            <Drawer.Screen
              name="Stats"
              component={StatsScreen}
              options={{
                title: 'Statistics',
                drawerLabel: 'Statistics',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="LeagueTable"
              component={LeagueTableScreen}
              options={{
                title: 'League Table',
                drawerLabel: 'League Table',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="table" size={size} color={color} />
                ),
              }}
            />

            {/* Media & Content */}
            <Drawer.Screen
              name="Gallery"
              component={GalleryScreen}
              options={{
                title: 'Gallery',
                drawerLabel: 'Gallery',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="image-multiple" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="Highlights"
              component={HighlightsScreen}
              options={{
                title: 'Highlights',
                drawerLabel: 'Highlights',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="movie-star" size={size} color={color} />
                ),
              }}
            />

            {/* Training */}
            <Drawer.Screen
              name="Training"
              component={TrainingScreen}
              options={{
                title: 'Training',
                drawerLabel: 'Training',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="whistle" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="DrillLibrary"
              component={DrillLibraryScreen}
              options={{
                title: 'Drill Library',
                drawerLabel: 'Drill Library',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
                ),
              }}
            />

            {/* Communication */}
            <Drawer.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title: 'Chat',
                drawerLabel: 'Chat',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="chat" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="CreatePost"
              component={CreatePostScreen}
              options={{
                title: 'Create Post',
                drawerLabel: 'Create Post',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="pencil" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="AutoPostsMatrix"
              component={AutoPostsMatrixScreen}
              options={{
                title: 'Auto Posts',
                drawerLabel: 'Auto Posts',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="robot" size={size} color={color} />
                ),
              }}
            />

            {/* Shop & Commerce */}
            <Drawer.Screen
              name="Shop"
              component={ShopScreen}
              options={{
                title: 'Shop',
                drawerLabel: 'Shop',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="shopping" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="Payments"
              component={PaymentsScreen}
              options={{
                title: 'Payments',
                drawerLabel: 'Payments',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="credit-card" size={size} color={color} />
                ),
              }}
            />

            {/* Management */}
            <Drawer.Screen
              name="Manage"
              component={ManageScreen}
              options={{
                title: 'Manage',
                drawerLabel: 'Manage',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="cog" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManageUsers"
              component={ManageUsersScreen}
              options={{
                title: 'Manage Users',
                drawerLabel: 'Manage Users',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account-cog" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManageSquad"
              component={ManageSquadScreen}
              options={{
                title: 'Manage Squad',
                drawerLabel: 'Manage Squad',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManageFixtures"
              component={ManageFixturesScreen}
              options={{
                title: 'Manage Fixtures',
                drawerLabel: 'Manage Fixtures',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManageEvents"
              component={ManageEventsScreen}
              options={{
                title: 'Manage Events',
                drawerLabel: 'Manage Events',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="calendar-edit" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManageMOTM"
              component={ManageMOTMScreen}
              options={{
                title: 'Manage MOTM',
                drawerLabel: 'Manage MOTM',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="star-settings" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="ManagePlayerImages"
              component={ManagePlayerImagesScreen}
              options={{
                title: 'Manage Player Images',
                drawerLabel: 'Manage Player Images',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="image-edit" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="FixtureSettings"
              component={FixtureSettingsScreen}
              options={{
                title: 'Fixture Settings',
                drawerLabel: 'Fixture Settings',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="soccer-field" size={size} color={color} />
                ),
              }}
            />

            {/* Settings */}
            <Drawer.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
                drawerLabel: 'Settings',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="Config"
              component={ConfigScreen}
              options={{
                title: 'Configuration',
                drawerLabel: 'Configuration',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="tune" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="PushNotificationsSetup"
              component={PushNotificationsSetupScreen}
              options={{
                drawerItemStyle: { display: 'none' }
              }}
            />

            {/* Onboarding - Hidden due to required props */}
            <Drawer.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                drawerItemStyle: { display: 'none' }
              }}
            />

            {/* Hidden screens - can still navigate programmatically */}
            <Drawer.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                drawerItemStyle: { display: 'none' }
              }}
            />
          </Drawer.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
    </AuthProvider>
  );
}
