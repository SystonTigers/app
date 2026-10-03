import React from 'react';
import { Text, View } from 'react-native';
import LeagueRows from '../league/LeagueRows';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { ourMoveText, type LiveLeagueTable as LiveTable } from '../../utils/leagueTable';

/**
 * Live Match: the whole league table with the current score counted. Arrows
 * show who has moved; a dot marks the two teams playing now. Nothing is saved
 * until full time.
 */
export default function LiveLeagueTable({ live, ourTeam, competition }: { live: LiveTable; ourTeam: string; competition: string }) {
  const c = useBrandColors();
  const styles = useStyles();
  const move = ourMoveText(live, ourTeam);
  return (
    <View style={styles.wrap} testID="live-league-table">
      <View style={styles.head}>
        <Text style={styles.title}>AS IT STANDS</Text>
        {move ? <Text style={[styles.move, { color: c.primary }]}>{move}</Text> : null}
      </View>
      <Text style={styles.sub}>
        {competition} with the score now counted{live.opponentTeam ? '' : `. ${live.opponent} aren't in the table, so only our row moves`}.
      </Text>
      <LeagueRows
        rows={live.rows}
        ourTeam={ourTeam}
        showMoves
        palette={{ text: c.text, muted: c.textLight, line: c.border, brand: c.primary, highlight: c.primarySoft, up: c.success, down: c.error }}
      />
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  wrap: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 1 },
  move: { fontWeight: '800', fontSize: 13 },
  sub: { color: c.textLight, fontSize: 12, marginBottom: 8 },
}));
