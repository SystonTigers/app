import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * The top-left of every menu page: a back arrow to the previous page (when
 * there is one) next to the menu button.
 */
export default function HeaderLeft({ navigation, tintColor }: { navigation: { canGoBack: () => boolean; goBack: () => void }; tintColor?: string }) {
  const canGoBack = navigation.canGoBack();
  return (
    <View style={styles.row}>
      {canGoBack ? (
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.back}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={tintColor} />
        </Pressable>
      ) : null}
      <DrawerToggleButton tintColor={tintColor} accessibilityLabel="Open menu" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  back: { paddingLeft: 12, paddingRight: 2, paddingVertical: 8 },
});
