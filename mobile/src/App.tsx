import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from './src/theme';

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

// Premium dark theme with yellow accent
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brand.yellow,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.brand.yellow,
  },
};

function HeaderTitle() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ color: colors.bg, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }}>
        SYSTON TIGERS
      </Text>
    </View>
  );
}

const menuItems = [
  { label: 'Home', route: 'Home', icon: 'home' },
  { label: 'Calendar', route: 'Calendar', icon: 'calendar' },
  { label: 'Fixtures', route: 'Fixtures', icon: 'soccer' },
  { label: 'Squad', route: 'Squad', icon: 'account-group' },
  { label: 'Stats', route: 'Stats', icon: 'chart-bar' },
  { label: 'League Table', route: 'LeagueTable', icon: 'table' },
  { label: 'Videos', route: 'Videos', icon: 'video' },
  { label: 'Gallery', route: 'Gallery', icon: 'image-multiple' },
  { label: 'Highlights', route: 'Highlights', icon: 'movie-star' },
  { label: 'Payments', route: 'Payments', icon: 'credit-card' },
  { label: 'Shop', route: 'Shop', icon: 'shopping' },
  { label: 'Manage', route: 'Manage', icon: 'shield-crown' },
  { label: 'Settings', route: 'Settings', icon: 'cog' },
];

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ backgroundColor: colors.surface, paddingTop: 20 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.brand.yellow }}>SYSTON</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>TIGERS</Text>
      </View>

      {/* Menu Items */}
      {menuItems.map(({ label, route, icon }) => (
        <DrawerItem
          key={route}
          label={label}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name={icon as any} size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate(route)}
          labelStyle={{ color: colors.text, fontWeight: '600', fontSize: 16 }}
          style={{ borderBottomColor: colors.border, borderBottomWidth: 0.5 }}
          activeTintColor={colors.brand.yellow}
          inactiveTintColor={colors.textDim}
        />
      ))}
    </DrawerContentScrollView>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerTitle: () => <HeaderTitle />,
            headerStyle: { backgroundColor: colors.brand.yellow },
            headerTintColor: colors.bg,
            drawerStyle: { backgroundColor: colors.surface, width: 280 },
            drawerActiveTintColor: colors.brand.yellow,
            drawerActiveBackgroundColor: colors.surfaceAlt,
            drawerInactiveTintColor: colors.textDim,
          }}
          initialRouteName="Home"
        >
          <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'Syston Tigers' }} />
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
    </PaperProvider>
  );
}
