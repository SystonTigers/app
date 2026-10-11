import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { useClub } from '../../context/ClubContext';
import { setCurrentClub } from '../../services/club';
import { apiErrorMessage, clubOptionsApi } from '../../services/api';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { TEAM_TYPES, type TeamType } from '../../utils/teamType';

/**
 * Junior or adult team. Adults: photos and clips are used unless a player
 * says no, players answer for themselves, fixtures are public and posts use
 * full names. Switching also sets the matching name and photo defaults
 * (they can still be changed under What gets posted).
 */
export default function TeamTypeCard({ canManage, onChanged, onMessage }: { canManage: boolean; onChanged: () => void; onMessage: (text: string, error?: boolean) => void }) {
  const c = useBrandColors();
  const card = useCardStyles();
  const styles = useStyles();
  const { club } = useClub();
  const current: TeamType = club?.teamType === 'adult' ? 'adult' : 'junior';
  const [picked, setPicked] = useState<TeamType>(current);
  const [saving, setSaving] = useState(false);
  const choice = TEAM_TYPES.find((t) => t.value === picked)!;

  const save = async () => {
    if (!club || picked === current) return;
    setSaving(true);
    try {
      await clubOptionsApi.setTeamType(picked);
      await setCurrentClub({ ...club, teamType: picked });
      onChanged();
      onMessage(picked === 'adult' ? 'Saved: adult team. Players now answer for themselves.' : 'Saved: junior team. Parents answer for their children again.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "That didn't save. Please try again."), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard icon="account-group-outline" title="Team type" help="Junior teams need a parent's yes before photos are used and keep match times private. Adult teams' players answer for themselves." testID="team-type-card">
      <View style={styles.options} accessibilityRole="radiogroup">
        {TEAM_TYPES.map((t) => {
          const on = picked === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setPicked(t.value)}
              disabled={!canManage || saving}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !canManage }}
              style={[styles.option, on ? styles.optionOn : null]}
            >
              <MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? c.primary : c.textLight} />
              <View style={styles.flex}>
                <Text style={card.body}>{t.label}</Text>
                <Text style={card.muted}>{t.short}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={card.sub}>{picked === current ? `What a${picked === 'adult' ? 'n adult' : ' junior'} team means` : `If you switch to a${picked === 'adult' ? 'n adult' : ' junior'} team`}</Text>
      {choice.means.map((line) => (
        <View key={line} style={styles.line}>
          <MaterialCommunityIcons name="check" size={16} color={c.primary} style={styles.tick} />
          <Text style={[card.muted, styles.flex]}>{line}</Text>
        </View>
      ))}

      {canManage ? (
        picked !== current ? (
          <View style={card.buttons}>
            <Button mode="contained" onPress={save} loading={saving} disabled={saving}>Switch to {choice.label.toLowerCase()}</Button>
            <Button mode="text" onPress={() => setPicked(current)} disabled={saving}>Cancel</Button>
          </View>
        ) : null
      ) : (
        <Text style={card.locked}>Only the club&apos;s admins can change this.</Text>
      )}
    </SettingsCard>
  );
}

const useStyles = themedStyles((c) => ({
  flex: { flex: 1 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, minHeight: 56 },
  optionOn: { borderColor: c.primary },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  tick: { marginTop: 1 },
}));
