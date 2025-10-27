import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { COLORS } from './config';

// Import screens
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import FixturesScreen from './screens/FixturesScreen';
import SquadScreen from './screens/SquadScreen';
import StatsScreen from './screens/StatsScreen';
import LeagueTableScreen from './screens/LeagueTableScreen';
import VideoScreen from './screens/VideoScreen';
import GalleryScreen from './screens/GalleryScreen';
import HighlightsScreen from './screens/HighlightsScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import ShopScreen from './screens/ShopScreen';
import ManageScreen from './screens/ManageScreen';
import SettingsScreen from './screens/SettingsScreen';
import TrainingScreen from './screens/TrainingScreen';
import ChatScreen from './screens/ChatScreen';
import { ErrorBoundary } from './ErrorBoundary';

const Drawer = createDrawerNavigator();

// Configure Paper theme with MD3
const paperTheme = {
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

function HeaderTitle() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#000' }}>
        FIELD DROP
      </Text>
    </View>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Drawer.Navigator
        screenOptions={{
          headerTitle: () => <HeaderTitle />,
          headerStyle: {
            backgroundColor: '#FFD700',
          },
          headerTintColor: '#000',
          drawerStyle: {
            backgroundColor: COLORS.background,
            width: 280,
          },
          drawerActiveTintColor: COLORS.primary,
          drawerInactiveTintColor: COLORS.textLight,
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '600',
          },
        }}
        initialRouteName="Home"
      >
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: '🏠 Home', drawerLabel: 'Home' }} />
        <Drawer.Screen name="Calendar" component={CalendarScreen} options={{ title: '📅 Calendar', drawerLabel: 'Calendar' }} />
        <Drawer.Screen name="Fixtures" component={FixturesScreen} options={{ title: '⚽ Fixtures', drawerLabel: 'Fixtures' }} />
        <Drawer.Screen name="Squad" component={SquadScreen} options={{ title: '👥 Squad', drawerLabel: 'Squad' }} />
        <Drawer.Screen name="Stats" component={StatsScreen} options={{ title: '📊 Stats', drawerLabel: 'Stats' }} />
        <Drawer.Screen name="LeagueTable" component={LeagueTableScreen} options={{ title: '🏆 League Table', drawerLabel: 'League Table' }} />
        <Drawer.Screen name="Videos" component={VideoScreen} options={{ title: '🎬 Videos', drawerLabel: 'Videos' }} />
        <Drawer.Screen name="Gallery" component={GalleryScreen} options={{ title: '📸 Gallery', drawerLabel: 'Gallery' }} />
        <Drawer.Screen name="Highlights" component={HighlightsScreen} options={{ title: '⭐ Highlights', drawerLabel: 'Highlights' }} />
        <Drawer.Screen name="Payments" component={PaymentsScreen} options={{ title: '💳 Payments', drawerLabel: 'Payments' }} />
        <Drawer.Screen name="Shop" component={ShopScreen} options={{ title: '🛍️ Shop', drawerLabel: 'Shop' }} />
        <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: '🏃 Training', drawerLabel: 'Training' }} />
        <Drawer.Screen name="Chat" component={ChatScreen} options={{ title: '💬 Chat', drawerLabel: 'Chat' }} />
        <Drawer.Screen name="Manage" component={ManageScreen} options={{ title: '⚙️ Manage', drawerLabel: 'Manage' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: '🔧 Settings', drawerLabel: 'Settings' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
