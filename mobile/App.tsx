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

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';
import VideoScreen from './src/screens/VideoScreen';

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
            <Drawer.Screen
              name="CalendarDrawer"
              component={CalendarScreen}
              options={{
                title: 'Calendar',
                drawerLabel: 'Calendar',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="calendar" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="FixturesDrawer"
              component={FixturesScreen}
              options={{
                title: 'Fixtures',
                drawerLabel: 'Fixtures',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="soccer" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="SquadDrawer"
              component={SquadScreen}
              options={{
                title: 'Squad',
                drawerLabel: 'Squad',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account-group" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen
              name="VideosDrawer"
              component={VideoScreen}
              options={{
                title: 'Videos',
                drawerLabel: 'Videos',
                drawerIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="video" size={size} color={color} />
                ),
              }}
            />
          </Drawer.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
