import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import AnswerButtons from './AnswerButtons';
import { countsLine, TYPE_ICON, whenLabel, type Answer, type AvailabilityItem, type ChildAnswer } from '../../utils/availability';

/**
 * One match, training session or event: when and where, then each of my
 * children with Available / Maybe / Can't make it. After "Maybe" or "Can't",
 * the family can leave a short note for the coaches. Staff also see the
 * squad totals and open the full list.
 */
export default function ItemCard({ item, today, saving, onAnswer, onOpenSquad }: {
  item: AvailabilityItem;
  today: string;
  /** player id being saved, if any */
  saving: string | null;
  onAnswer: (child: ChildAnswer, status: Answer | null, note: string | null) => void;
  onOpenSquad?: () => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}><MaterialCommunityIcons name={TYPE_ICON[item.type] as never} size={20} color={c.primary} /></View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>{item.title.toUpperCase()}</Text>
          <Text style={styles.meta}>
            {whenLabel(item, today)}
            {item.homeAway ? ` · ${item.homeAway === 'away' ? 'Away' : 'Home'}` : ''}
            {item.place ? ` · ${item.place}` : ''}
          </Text>
        </View>
      </View>

      {item.children.map((child) => {
        const draft = notes[child.playerId] ?? child.note ?? '';
        const asksNote = child.status === 'no' || child.status === 'maybe';
        return (
          <View key={child.playerId} style={styles.child}>
            {item.children.length > 1 || onOpenSquad ? <Text style={styles.name}>{child.name}</Text> : null}
            <AnswerButtons value={child.status} name={child.name} disabled={saving === child.playerId}
              onChange={(next) => onAnswer(child, next, next === 'no' || next === 'maybe' ? (draft.trim() || null) : null)} />
            {asksNote ? (
              <TextInput
                mode="outlined"
                dense
                value={draft}
                onChangeText={(v) => setNotes((n) => ({ ...n, [child.playerId]: v.slice(0, 120) }))}
                onBlur={() => { if ((draft.trim() || null) !== (child.note ?? null)) onAnswer(child, child.status, draft.trim() || null); }}
                placeholder="A note for the coach (optional), e.g. holiday"
                accessibilityLabel={`A note for the coach about ${child.name}`}
                returnKeyType="done"
                style={styles.note}
              />
            ) : null}
          </View>
        );
      })}

      {onOpenSquad ? (
        <Pressable onPress={onOpenSquad} accessibilityRole="button" accessibilityLabel={`See who's available for ${item.title}`}
          style={({ pressed }) => [styles.squad, pressed ? styles.pressed : null]}>
          <View style={styles.flex}>
            <Text style={styles.squadTitle}>The squad</Text>
            <Text style={styles.meta}>{countsLine(item.counts)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={c.textLight} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 0.6 },
  meta: { color: c.textLight, fontSize: 12, marginTop: 2 },
  child: { gap: 8 },
  name: { color: c.text, fontWeight: '800' },
  note: { backgroundColor: c.surfaceRaised, fontSize: 14 },
  squad: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, minHeight: 44 },
  squadTitle: { color: c.text, fontWeight: '800' },
  pressed: { opacity: 0.8 },
}));
