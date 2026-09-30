import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Crest from '../home/Crest';
import { FONTS } from '../../theme/brandFonts';
import { themedStyles, useBrandColors } from '../../theme/brand';

const OPPONENT = '#8E99A4';

export interface Side { name: string; color: string; badgeUrl?: string | null; score?: number | null }

/**
 * One match on the Fixtures screen: both crests with the kick-off time (or the
 * score once played) between them, then when/where and any actions.
 */
export default function MatchRow({ home, away, middle, middleSub, label, labelTone, details, actions, onPress, accessibilityLabel }: {
  home: Side; away: Side; middle: string; middleSub?: string; label?: string; labelTone?: 'win' | 'draw' | 'loss' | 'accent';
  details: Array<{ icon: string; text: string }>; actions?: React.ReactNode; onPress?: () => void; accessibilityLabel: string;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const tone = labelTone === 'win' ? '#2BD576' : labelTone === 'loss' ? '#FF5470' : labelTone === 'draw' ? '#F5C400' : c.primary;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}>
      {label ? (
        <View style={[styles.label, { borderColor: tone }]}>
          <Text style={[styles.labelText, { color: tone }]}>{label}</Text>
        </View>
      ) : null}
      <View style={styles.teams}>
        <Team side={home} />
        <View style={styles.middle}>
          <Text style={styles.middleText}>{middle}</Text>
          {middleSub ? <Text style={styles.middleSub}>{middleSub}</Text> : null}
        </View>
        <Team side={away} />
      </View>
      <View style={styles.details}>
        {details.map((d) => (
          <View key={d.icon + d.text} style={styles.detail}>
            <MaterialCommunityIcons name={d.icon as never} size={15} color={c.textLight} />
            <Text style={styles.detailText} numberOfLines={2}>{d.text}</Text>
          </View>
        ))}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Pressable>
  );
}

function Team({ side }: { side: Side }) {
  const styles = useStyles();
  return (
    <View style={styles.team}>
      <Crest name={side.name} color={side.color} badgeUrl={side.badgeUrl} size={44} />
      <Text style={styles.teamName} numberOfLines={2}>{side.name.toUpperCase()}</Text>
    </View>
  );
}

export const opponentSide = (name: string, score?: number | null): Side => ({ name, color: OPPONENT, badgeUrl: null, score });

const useStyles = themedStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  pressed: { backgroundColor: c.surfaceRaised },
  label: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 10 },
  labelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  teams: { flexDirection: 'row', alignItems: 'center' },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  teamName: { color: c.text, fontFamily: FONTS.display, fontSize: 15, letterSpacing: 0.3, textAlign: 'center' },
  middle: { minWidth: 86, alignItems: 'center' },
  middleText: { color: c.text, fontFamily: FONTS.display, fontSize: 30, letterSpacing: 1 },
  middleSub: { color: c.textLight, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: -2 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  detailText: { color: c.textLight, fontSize: 13, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
}));
