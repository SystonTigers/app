import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { withOpacity } from '../../theme/utils';
import { FONTS } from '../../theme/brandFonts';
import type { AppDrill } from '../../utils/drills';

export function difficultyColor(c: ReturnType<typeof useBrandColors>, difficulty: string): string {
  return difficulty === 'beginner' ? c.success : difficulty === 'advanced' ? c.error : c.warning;
}

/** One drill in the library: name, category, time, players, a star and how many videos it has. */
export default function DrillCard({ drill, favourite, videos, onPress, onToggleFavourite }: {
  drill: AppDrill; favourite: boolean; videos: number; onPress: () => void; onToggleFavourite: () => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const diff = difficultyColor(c, drill.difficulty);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${drill.name}, ${drill.category}, ${drill.duration}`} style={({ pressed }) => [styles.card, pressed ? { opacity: 0.85 } : null]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{drill.name}</Text>
          <Text style={styles.category}>{drill.club ? 'OUR DRILL · ' : ''}{drill.category.toUpperCase()}</Text>
        </View>
        <IconButton
          icon={favourite ? 'star' : 'star-outline'}
          iconColor={favourite ? c.primary : c.textLight}
          size={24}
          onPress={onToggleFavourite}
          accessibilityLabel={favourite ? `Remove ${drill.name} from favourites` : `Add ${drill.name} to favourites`}
          style={styles.star}
        />
      </View>
      <View style={styles.meta}>
        <View style={[styles.pill, { backgroundColor: withOpacity(diff, 0.16) }]}>
          <Text style={[styles.pillText, { color: diff }]}>{drill.difficulty}</Text>
        </View>
        <Meta icon="clock-outline" text={drill.duration} />
        <Meta icon="account-group" text={drill.players} />
        {videos ? <Meta icon="play-circle-outline" text={`${videos} video${videos === 1 ? '' : 's'}`} /> : null}
      </View>
      <Text style={styles.description} numberOfLines={2}>{drill.description || drill.steps[0] || ''}</Text>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon as never} size={14} color={c.textLight} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  card: { marginBottom: 12, padding: 14, paddingTop: 10, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 0.4, marginTop: 4 },
  category: { color: c.textLight, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  star: { margin: -4 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: c.textLight, fontSize: 12 },
  description: { color: c.text, fontSize: 14, lineHeight: 20, marginTop: 10 },
}));
