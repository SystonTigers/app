import React from 'react';
import { Text, View } from 'react-native';
import { themedStyles } from '../../theme/brand';
import type { MakeHighlightsVideoProps } from '../../utils/highlights';

/** iOS/Android store app: making the video file happens in the web app. */
export default function MakeHighlightsVideo(_: MakeHighlightsVideoProps) {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Text style={styles.text}>To make a video to post, open the club app in your phone or laptop's web browser and go to these highlights.</Text>
    </View>
  );
}

const useStyles = themedStyles((COLORS) => ({
  box: { padding: 12, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  text: { color: COLORS.textLight },
}));
