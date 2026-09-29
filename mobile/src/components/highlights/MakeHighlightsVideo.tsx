import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config';
import type { HighlightMoment } from '../../utils/highlights';

/** iOS/Android store app: making the video file happens in the web app. */
export default function MakeHighlightsVideo(_: { moments: HighlightMoment[]; fileName: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>To make a video to post, open the club app in your phone or laptop's web browser and go to these highlights.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.textLight },
  text: { color: COLORS.textLight },
});
