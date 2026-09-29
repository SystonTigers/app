import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Backdrop from '../brand/Backdrop';
import Crest from './Crest';
import { FONTS } from '../../theme/brandFonts';
import { greeting } from './homeUtils';

/** The top of the home screen: menu, the club's crest and name over the brand backdrop. */
export default function HomeHeader({ clubName, color, badgeUrl, firstName, topInset, onMenu }: {
  clubName: string; color: string; badgeUrl?: string | null; firstName?: string | null; topInset: number; onMenu: () => void;
}) {
  return (
    <View style={[styles.wrap, { paddingTop: topInset + 6 }]}>
      <Backdrop color={color} width={420} height={230} glowY={0.2} />
      <View style={styles.bar}>
        <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Open menu" hitSlop={10} style={styles.menu}>
          <MaterialCommunityIcons name="menu" size={26} color="#F2F5F7" />
        </Pressable>
      </View>
      <View style={styles.club}>
        <Crest name={clubName} color={color} badgeUrl={badgeUrl} size={62} />
        <View style={styles.titles}>
          <Text style={styles.hello}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <Text style={styles.name} numberOfLines={2}>{clubName.toUpperCase()}</Text>
        </View>
      </View>
      <View style={[styles.underline, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 18, overflow: 'hidden' },
  bar: { flexDirection: 'row', paddingHorizontal: 8 },
  menu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)' },
  club: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, marginTop: 10 },
  titles: { flex: 1 },
  hello: { color: 'rgba(242,245,247,0.7)', fontSize: 14, fontWeight: '600' },
  name: { color: '#F2F5F7', fontFamily: FONTS.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.5 },
  underline: { position: 'absolute', left: 18, bottom: 0, width: 56, height: 3, borderRadius: 2 },
});
