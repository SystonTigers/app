import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { useClub } from '../../context/ClubContext';
import { setCurrentClub, type ClubModule, type ClubModules } from '../../services/club';
import { apiErrorMessage, clubOptionsApi } from '../../services/api';

const EXTRAS: Array<{ id: ClubModule; title: string; text: string }> = [
  { id: 'subs', title: 'Subs and fees', text: 'Ask families for subs and send reminders (Manager zone → Subs and fees).' },
  { id: 'signingOn', title: 'Signing on', text: "Each season, families fill in their child's details, emergency contacts and consent." },
  { id: 'shop', title: 'Club shop', text: 'Club kit and personalised gifts in the app (My club → Club shop).' },
];

/**
 * Club extras each club switches on for itself. Off unless switched on, so a
 * club that uses another system (TeamFeePay and the like) never sees them:
 * their menus disappear and the server refuses them.
 */
export default function ClubExtrasCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string) => void }) {
  const card = useCardStyles();
  const { club } = useClub();
  const modules: ClubModules = { subs: false, signingOn: false, shop: false, ...club?.modules };
  const [saving, setSaving] = useState<ClubModule | null>(null);

  const change = async (id: ClubModule, on: boolean) => {
    if (!club) return;
    setSaving(id);
    try {
      await clubOptionsApi.setModules({ [id]: on });
      await setCurrentClub({ ...club, modules: { ...modules, [id]: on } });
      const name = EXTRAS.find((e) => e.id === id)?.title ?? 'That';
      onMessage(on ? `${name} is on for everyone at the club.` : `${name} is off. Nobody at the club sees it now.`);
    } catch (err) {
      onMessage(apiErrorMessage(err, "That didn't save. Please try again."));
    } finally {
      setSaving(null);
    }
  };

  return (
    <SettingsCard icon="puzzle-outline" title="Club extras" help="Switch on only what your club uses. If you already use something else for subs or signing on, leave those off and nobody sees them.">
      {EXTRAS.map((e) => (
        <View key={e.id} style={styles.toggle}>
          <View style={{ flex: 1 }}>
            <Text style={card.body}>{e.title}</Text>
            <Text style={card.muted}>{e.text}</Text>
          </View>
          <Switch value={modules[e.id]} onValueChange={(on) => change(e.id, on)} disabled={!canManage || !!saving} accessibilityLabel={e.title} />
        </View>
      ))}
      {!canManage ? <Text style={card.locked}>Only the club&apos;s admins can change these.</Text> : null}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
