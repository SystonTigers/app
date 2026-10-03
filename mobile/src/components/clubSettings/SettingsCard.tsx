import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** One section of Club Settings: icon, title, a line of help, then its controls. */
export default function SettingsCard({ icon, title, help, children, testID }: {
  icon: IconName;
  title: string;
  help?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  const c = useBrandColors();
  const styles = useCardStyles();
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={icon} size={22} color={c.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
      </View>
      {help ? <Text style={styles.help}>{help}</Text> : null}
      {children}
    </View>
  );
}

/** Shared look for everything inside the cards. */
export const useCardStyles = themedStyles((c) => ({
  card: { marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  icon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: `${c.primary}55`, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 0.6, textTransform: 'uppercase', color: c.text },
  help: { color: c.textLight, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  sub: { color: c.text, fontWeight: '700', fontSize: 14, marginTop: 14, marginBottom: 6 },
  body: { color: c.text, fontSize: 14, lineHeight: 20 },
  muted: { color: c.textLight, fontSize: 13, lineHeight: 18 },
  locked: { color: c.warning, fontSize: 13, lineHeight: 18, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  buttons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  input: { backgroundColor: c.surfaceRaised, marginTop: 4 },
  mono: { fontFamily: 'monospace', color: c.text, fontSize: 13 },
  box: { borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, padding: 12, marginTop: 10 },
  error: { color: c.error, fontSize: 13, marginTop: 8 },
}));
