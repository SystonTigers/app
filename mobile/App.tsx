import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from './src/config';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import SquadScreen from './src/screens/SquadScreen';

const Tab = createBottomTabNavigator();

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
                tabBarIcon: ({ color, size }) => (
                  <MaterialCommunityIcons name="account-group" size={size} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
