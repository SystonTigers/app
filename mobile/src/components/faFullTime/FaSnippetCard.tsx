import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import FaFullTimeView from './FaFullTimeView';
import SectionTitle from '../home/SectionTitle';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { useClub } from '../../context/ClubContext';

/**
 * One FA Full-Time snippet (fixtures, results or the team's own) in a card,
 * in the club's colours, with our team picked out.
 */
/** `flush`: inside a screen that already has side padding. */
export default function FaSnippetCard({ code, title, flush = false }: { code: string; title: string; flush?: boolean }) {
  const c = useBrandColors();
  const styles = useStyles();
  const { club } = useClub();
  const palette = useMemo(() => ({ text: c.text, muted: c.textLight, line: c.border, head: c.surfaceRaised, brand: c.primary }), [c]);
  return (
    <View>
      <SectionTitle title={title} color={c.primary} />
      <View style={[styles.card, flush ? styles.flush : null]}>
        <FaFullTimeView code={code} palette={palette} highlight={(club?.name || '').split(' ')[0]} />
      </View>
      <Text style={[styles.source, flush ? styles.flush : null]}>From FA Full-Time</Text>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  card: { marginHorizontal: 16, padding: 8, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden' },
  source: { color: c.textLight, fontSize: 12, marginHorizontal: 20, marginTop: 6, marginBottom: 12 },
  flush: { marginHorizontal: 0 },
}));
