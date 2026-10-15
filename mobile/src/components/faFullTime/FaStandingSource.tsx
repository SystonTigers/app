import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import FaFullTimeView from './FaFullTimeView';
import type { FrameMessage, FramePalette } from './frame';
import { goalsFromMatches, standingFromFa, withGoals, type Standing } from '../../utils/leagueStanding';

const PALETTE: FramePalette = { text: '#111827', muted: '#6b7280', line: '#e5e7eb', head: '#f9fafb', brand: '#16a34a' };

/**
 * Out of sight: loads the FA's table to read our row, then the FA's league
 * results for our team to fill in goals the table doesn't show. Calls
 * onStanding each time it knows more.
 */
export default function FaStandingSource({ tableCode, resultsCode, highlight, onStanding }: {
  tableCode: string;
  resultsCode?: string;
  highlight: string;
  onStanding: (standing: Standing) => void;
}) {
  const [base, setBase] = useState<Standing | null>(null);
  const filter = useMemo(() => ({ filter: base?.team ?? '' }), [base?.team]);

  const fromTable = (msg: FrameMessage) => {
    if (!msg.standing) return;
    const s = standingFromFa(msg.standing.headers, msg.standing.cells);
    if (!s) return;
    setBase(s);
    onStanding(s);
  };
  const fromResults = (msg: FrameMessage) => {
    if (!base || !msg.matches) return;
    onStanding(withGoals(base, goalsFromMatches(msg.matches, base.team)));
  };

  return (
    <View style={{ height: 0, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <FaFullTimeView code={tableCode} palette={PALETTE} highlight={highlight} onMessage={fromTable} hidden />
      {resultsCode && base && (base.goalsFor === null || base.goalsAgainst === null) ? (
        <FaFullTimeView code={resultsCode} palette={PALETTE} highlight="" options={filter} onMessage={fromResults} hidden />
      ) : null}
    </View>
  );
}
