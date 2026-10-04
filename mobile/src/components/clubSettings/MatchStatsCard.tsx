import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { useClub, useTracksAssists } from '../../context/ClubContext';
import { setCurrentClub } from '../../services/club';
import { apiErrorMessage, clubOptionsApi } from '../../services/api';

/**
 * What the club records in match stats. Assists can be switched off for
 * clubs that only want top goalscorers: Match Centre stops asking, and stats,
 * player pages, the website and posts leave them out. Assists already
 * recorded are kept for if it's switched back on.
 */
export default function MatchStatsCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string) => void }) {
  const card = useCardStyles();
  const { club } = useClub();
  const tracked = useTracksAssists();
  const [saving, setSaving] = useState(false);

  const change = async (on: boolean) => {
    if (!club) return;
    setSaving(true);
    try {
      await clubOptionsApi.setTrackAssists(on);
      await setCurrentClub({ ...club, trackAssists: on });
      onMessage(on ? 'Assists are back on. Ones recorded before show again.' : 'Assists are off. Stats now show goals only.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon="soccer" title="Match stats" help="Some clubs only keep top goalscorers. Switch assists off and Match Centre stops asking who made the goal; stats, player pages, the website and posts leave assists out.">
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={card.body}>Record assists</Text>
          <Text style={card.muted}>{tracked ? 'On: Match Centre asks who made each goal.' : 'Off: goals only. Assists recorded before are kept if you switch back on.'}</Text>
        </View>
        <Switch value={tracked} onValueChange={change} disabled={!canManage || saving} accessibilityLabel="Record assists" />
      </View>
      {!canManage ? <Text style={card.locked}>Only the club&apos;s admins can change this.</Text> : null}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
