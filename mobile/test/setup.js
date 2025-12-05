/**
 * Jest Test Setup for React Native Components
 *
 * This file sets up:
 * - Theme context mock
 * - AsyncStorage mock
 * - Common test utilities
 */

import '@testing-library/react-native/extend-expect';

// ============================================================================
// Mock AsyncStorage
// ============================================================================
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// Mock Expo modules
// ============================================================================
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 52.629, longitude: -1.131 },
    })
  ),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  MediaTypeOptions: { Videos: 'Videos', Images: 'Images' },
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[mock-token]' })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-av', () => ({
  Video: 'Video',
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  },
  ResizeMode: {
    CONTAIN: 'contain',
    COVER: 'cover',
    STRETCH: 'stretch',
  },
}));

// ============================================================================
// Mock react-native-paper
// ============================================================================
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');

  return {
    Provider: ({ children }) => children,
    Portal: ({ children }) => children,
    Surface: ({ children, style }) =>
      React.createElement(View, { style }, children),
    Card: ({ children, style, onPress }) =>
      onPress
        ? React.createElement(TouchableOpacity, { style, onPress }, children)
        : React.createElement(View, { style }, children),
    Title: ({ children, style }) =>
      React.createElement(Text, { style }, children),
    Paragraph: ({ children, style }) =>
      React.createElement(Text, { style }, children),
    Button: ({ children, onPress, style, mode }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, accessibilityRole: 'button' },
        React.createElement(Text, null, children)
      ),
    TextInput: (props) =>
      React.createElement(TextInput, {
        ...props,
        accessibilityRole: 'text',
      }),
    IconButton: ({ icon, onPress, size }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, accessibilityRole: 'button' },
        React.createElement(Text, null, icon)
      ),
    FAB: ({ icon, onPress, style }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, accessibilityRole: 'button' },
        React.createElement(Text, null, icon)
      ),
    Modal: ({ visible, children }) =>
      visible ? React.createElement(View, null, children) : null,
    Snackbar: ({ visible, children }) =>
      visible ? React.createElement(View, null, children) : null,
    ActivityIndicator: ({ animating }) =>
      animating ? React.createElement(View, { testID: 'loading' }) : null,
    Divider: () => React.createElement(View, { style: { height: 1 } }),
    Chip: ({ children, onPress, style }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style },
        React.createElement(Text, null, children)
      ),
    Avatar: {
      Text: ({ label }) =>
        React.createElement(View, null, React.createElement(Text, null, label)),
      Image: ({ source }) =>
        React.createElement(View, { testID: 'avatar-image' }),
    },
    useTheme: () => ({
      colors: {
        primary: '#FFD700',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        error: '#F44336',
      },
    }),
  };
});

// ============================================================================
// Mock Brand Service
// ============================================================================
jest.mock('../src/services/brandService', () => ({
  fetchBrand: jest.fn(() => Promise.resolve(null)),
  brandToTheme: jest.fn(() => ({})),
}));

// ============================================================================
// Mock Navigation
// ============================================================================
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// ============================================================================
// Silence Console Warnings in Tests
// ============================================================================
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    // Ignore specific React Native warnings
    if (
      args[0]?.includes?.('Animated') ||
      args[0]?.includes?.('NativeEventEmitter')
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };

  console.error = (...args) => {
    // Ignore specific React Native errors
    if (
      args[0]?.includes?.('Warning: ReactDOM.render') ||
      args[0]?.includes?.('act()')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// ============================================================================
// Global Test Utilities
// ============================================================================
global.mockTheme = {
  colors: {
    primary: '#FFD700',
    primaryLight: '#FFF3CD',
    primaryDark: '#CC9A00',
    secondary: '#000000',
    accent: '#FFA500',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textLight: '#666666',
    textDisabled: '#999999',
    textInverse: '#FFFFFF',
    border: '#E0E0E0',
    borderLight: '#EEEEEE',
    error: '#F44336',
    errorLight: '#FFEBEE',
    errorDark: '#C62828',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    successDark: '#2E7D32',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    warningDark: '#E65100',
    info: '#2196F3',
    infoLight: '#E3F2FD',
    infoDark: '#1565C0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
      black: 'System',
    },
    fontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
  },
  shadows: {
    none: {},
    sm: { elevation: 2 },
    md: { elevation: 4 },
    lg: { elevation: 8 },
  },
};
