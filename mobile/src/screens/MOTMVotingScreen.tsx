import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config';

/**
 * Player-facing Man of the Match voting.
 *
 * Not linked from the drawer or home feed: the backend has no endpoint that
 * lists open votes (or their nominees) to non-admin users yet. The route stays
 * registered so old deep links land on a clear message instead of a crash.
 * Managers run votes from "Manage MOTM".
 */
export default function MOTMVotingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="star-circle-outline" size={56} color={COLORS.textLight} />
        <Text style={styles.emptyText}>No Man of the Match vote is open</Text>
        <Text style={styles.emptySubtext}>Check back after the final whistle.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
