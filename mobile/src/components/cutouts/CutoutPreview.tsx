import React from 'react';
import { Image, View } from 'react-native';
import { themedStyles } from '../../theme/brand';

/**
 * A player's cut-out standing on the club's colour, roughly how it sits in a
 * goal graphic, so staff can see the edges are clean before saving it.
 */
export default function CutoutPreview({ uri, height, label }: { uri: string; height: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.panel, { height }]}>
      <View style={styles.band} />
      <Image source={{ uri }} style={styles.image} resizeMode="contain" accessibilityLabel={label} />
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  panel: { backgroundColor: c.primary, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  band: { position: 'absolute', left: -40, right: -40, top: '38%', height: '26%', backgroundColor: '#06080B', opacity: 0.35, transform: [{ rotate: '-8deg' }] },
  image: { width: '100%', height: '100%' },
}));
