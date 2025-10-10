import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './src/config';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import VideoScreen from './src/screens/VideoScreen';

// Management Screens
import ManageScreen from './src/screens/ManageScreen';
import ManageFixturesScreen from './src/screens/ManageFixturesScreen';
import ManageSquadScreen from './src/screens/ManageSquadScreen';
import ManageEventsScreen from './src/screens/ManageEventsScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import ManagePlayerImagesScreen from './src/screens/ManagePlayerImagesScreen';
import ManageMOTMScreen from './src/screens/ManageMOTMScreen';
import AutoPostsMatrixScreen from './src/screens/AutoPostsMatrixScreen';
import ConfigScreen from './src/screens/ConfigScreen';

// Phase 1 Screens
import LeagueTableScreen from './src/screens/LeagueTableScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Phase 2 Screens
import GalleryScreen from './src/screens/GalleryScreen';
import HighlightsScreen from './src/screens/HighlightsScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ShopScreen from './src/screens/ShopScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Management Stack Navigator
function ManagementStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.secondary,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ManageHome"
        component={ManageScreen}
        options={{ title: 'Management', headerShown: false }}
      />
      <Stack.Screen
        name="ManageFixtures"
        component={ManageFixturesScreen}
        options={{ title: 'Manage Fixtures' }}
      />
      <Stack.Screen
        name="ManageSquad"
        component={ManageSquadScreen}
        options={{ title: 'Manage Squad' }}
      />
      <Stack.Screen
        name="ManageEvents"
        component={ManageEventsScreen}
        options={{ title: 'Manage Events' }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
      <Stack.Screen
        name="ManagePlayerImages"
        component={ManagePlayerImagesScreen}
        options={{ title: 'Player Images', headerShown: false }}
      />
      <Stack.Screen
        name="ManageMOTM"
        component={ManageMOTMScreen}
        options={{ title: 'MOTM Voting', headerShown: false }}
      />
      <Stack.Screen
        name="AutoPostsMatrix"
        component={AutoPostsMatrixScreen}
        options={{ title: 'Auto-Posts Matrix', headerShown: false }}
      />
      <Stack.Screen
        name="Config"
        component={ConfigScreen}
        options={{ title: 'Club Config', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

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

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Tab.Navigator
            screenOptions={{
              tabBarActiveTintColor: COLORS.primary,
              tabBarInactiveTintColor: COLORS.textLight,
              tabBarStyle: {
                backgroundColor: COLORS.surface,
                borderTopColor: COLORS.background,
              },
              tabBarScrollEnabled: true,
              tabBarLabelStyle: {
                fontSize: 11,
              },
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: COLORS.secondary,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                title: 'Syston Tigers',
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
              name="Stats"
              component={StatsScreen}
              options={{
                title: 'Stats',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Table"
              component={LeagueTableScreen}
              options={{
                title: 'Table',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="table" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Videos"
              component={VideoScreen}
              options={{
                title: 'Videos',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="video" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Gallery"
              component={GalleryScreen}
              options={{
                title: 'Gallery',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="image-multiple" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Highlights"
              component={HighlightsScreen}
              options={{
                title: 'Highlights',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="movie-star" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Payments"
              component={PaymentsScreen}
              options={{
                title: 'Payments',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="credit-card" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Shop"
              component={ShopScreen}
              options={{
                title: 'Shop',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="shopping" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Manage"
              component={ManagementStack}
              options={{
                title: 'Manage',
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="shield-crown" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="cog" size={size} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
