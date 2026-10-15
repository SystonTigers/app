import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import FaFullTimeView from './FaFullTimeView';
import type { FrameMessage, FramePalette } from './frame';
import { goalsFromMatches } from '../../utils/leagueStanding';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

/**
 * Tapping a team in the FA's league table: that team's matches this season,
 * from the FA's league results snippet filtered to the team (frame.ts).
 */
export default function TeamResultsSheet({ team, resultsCode, palette, onClose }: {
  team: string | null;
  /** The club's FA league results snippet, if it has one */
  resultsCode?: string;
  palette: FramePalette;
  onClose: () => void;
}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [matches, setMatches] = useState<string[][] | null>(null);
  useEffect(() => { setMatches(null); }, [team]);
  const options = useMemo(() => ({ filter: team ?? '' }), [team]);
  const totals = matches && team ? goalsFromMatches(matches, team) : null;

  const onMessage = (msg: FrameMessage) => {
    if (typeof msg.matched === 'number') setMatches(msg.matches ?? []);
  };

  return (
    <Portal>
      <Modal visible={!!team} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <Text style={styles.title} numberOfLines={2}>{team}</Text>
        <Text style={styles.sub}>
          {totals && totals.played
            ? `${totals.played} result${totals.played === 1 ? '' : 's'} · scored ${totals.goalsFor}, conceded ${totals.goalsAgainst}`
            : 'Results this season, from FA Full-Time'}
        </Text>
        <ScrollView style={styles.list}>
          {resultsCode && team ? (
            <>
              <FaFullTimeView code={resultsCode} palette={palette} highlight="" options={options} onMessage={onMessage} />
              {matches && matches.length === 0 ? (
                <Text style={styles.note}>No results for {team} in the FA's results list yet. It only shows matches the league has put on FA Full-Time.</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.note}>The league's results from FA Full-Time aren't set up for the club yet, so we can't show each team's results.</Text>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.action} hitSlop={6}>
            <Text style={[styles.actionText, { color: c.primary }]}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, margin: 16, borderRadius: 18, padding: 16, maxHeight: '85%' },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 22, letterSpacing: 0.5, textTransform: 'uppercase' },
  sub: { color: c.textLight, fontSize: 13, marginTop: 2, marginBottom: 10, fontVariant: ['tabular-nums'] },
  list: { flexGrow: 0 },
  note: { color: c.textLight, fontSize: 14, paddingVertical: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  actionText: { fontWeight: '800', fontSize: 16 },
}));
