import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Theme and Feature Flags
import { ThemeProvider, useTheme } from './src/theme';
import { FeatureFlagsProvider, useFeatureFlags } from './src/features';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import StatsScreen from './src/screens/StatsScreen';
import LeagueTableScreen from './src/screens/LeagueTableScreen';
import VideoScreen from './src/screens/VideoScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import HighlightsScreen from './src/screens/HighlightsScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ShopScreen from './src/screens/ShopScreen';
import ManageScreen from './src/screens/ManageScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Drawer = createDrawerNavigator();

function HeaderTitle() {
  const { theme } = useTheme();

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }}>
        FIELD DROP
      </Text>
    </View>
  );
}

const menuItems = [
  { label: 'Home', route: 'Home', icon: 'home', feature: null },
  { label: 'Calendar', route: 'Calendar', icon: 'calendar', feature: null },
  { label: 'Fixtures', route: 'Fixtures', icon: 'soccer', feature: null },
  { label: 'Squad', route: 'Squad', icon: 'account-group', feature: null },
  { label: 'Stats', route: 'Stats', icon: 'chart-bar', feature: 'stats' },
  { label: 'League Table', route: 'LeagueTable', icon: 'table', feature: null },
  { label: 'Videos', route: 'Videos', icon: 'video', feature: 'highlights' },
  { label: 'Gallery', route: 'Gallery', icon: 'image-multiple', feature: 'gallery' },
  { label: 'Highlights', route: 'Highlights', icon: 'movie-star', feature: 'highlights' },
  { label: 'Payments', route: 'Payments', icon: 'credit-card', feature: 'payments' },
  { label: 'Shop', route: 'Shop', icon: 'shopping', feature: 'shop' },
  { label: 'Manage', route: 'Manage', icon: 'shield-crown', feature: 'admin' },
  { label: 'Settings', route: 'Settings', icon: 'cog', feature: null },
];

function CustomDrawerContent(props: any) {
  const { theme, isDark } = useTheme();
  const { isFeatureEnabled } = useFeatureFlags();

  // Filter menu items based on feature flags
  const visibleMenuItems = menuItems.filter(item =>
    !item.feature || isFeatureEnabled(item.feature as any)
  );

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        backgroundColor: theme.colors.surface,
        paddingTop: 20
      }}
    >
      {/* Header */}
      <View style={{
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: theme.colors.primary
        }}>
          FIELD
        </Text>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: theme.colors.text
        }}>
          DROP
        </Text>
      </View>

      {/* Menu Items */}
      {visibleMenuItems.map(({ label, route, icon }) => (
        <DrawerItem
          key={route}
          label={label}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name={icon as any} size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate(route)}
          labelStyle={{
            color: theme.colors.text,
            fontWeight: '600',
            fontSize: 16
          }}
          style={{
            borderBottomColor: theme.colors.border,
            borderBottomWidth: 1
          }}
          activeTintColor={theme.colors.primary}
          inactiveTintColor={theme.colors.textSecondary}
        />
      ))}
    </DrawerContentScrollView>
  );
}

function AppNavigator() {
  const { theme, isDark } = useTheme();

  // Create navigation theme from app theme
  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerTitle: () => <HeaderTitle />,
          headerStyle: {
            backgroundColor: theme.colors.primary
          },
          headerTintColor: theme.colors.secondary,
          drawerStyle: {
            backgroundColor: theme.colors.surface,
            width: 280
          },
          drawerActiveTintColor: theme.colors.primary,
          drawerActiveBackgroundColor: theme.colors.primaryLight,
          drawerInactiveTintColor: theme.colors.textSecondary,
        }}
        initialRouteName="Home"
      >
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Field Drop' }} />
        <Drawer.Screen name="Calendar" component={CalendarScreen} />
        <Drawer.Screen name="Fixtures" component={FixturesScreen} />
        <Drawer.Screen name="Squad" component={SquadScreen} />
        <Drawer.Screen name="Stats" component={StatsScreen} />
        <Drawer.Screen name="LeagueTable" options={{ title: 'League Table' }} component={LeagueTableScreen} />
        <Drawer.Screen name="Videos" component={VideoScreen} />
        <Drawer.Screen name="Gallery" component={GalleryScreen} />
        <Drawer.Screen name="Highlights" component={HighlightsScreen} />
        <Drawer.Screen name="Payments" component={PaymentsScreen} />
        <Drawer.Screen name="Shop" component={ShopScreen} />
        <Drawer.Screen name="Manage" component={ManageScreen} />
        <Drawer.Screen name="Settings" component={SettingsScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FeatureFlagsProvider>
        <PaperProvider>
          <AppNavigator />
        </PaperProvider>
      </FeatureFlagsProvider>
    </ThemeProvider>
  );
}
