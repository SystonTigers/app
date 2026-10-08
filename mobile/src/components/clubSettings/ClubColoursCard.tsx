import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { useClub } from '../../context/ClubContext';
import { setCurrentClub } from '../../services/club';
import { apiErrorMessage, clubOptionsApi } from '../../services/api';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { brightness, colourName, KIT_COLOURS, mainColourWarning, normaliseHex } from '../../utils/clubColours';

type Which = 'primary' | 'secondary';

/**
 * The club's kit colours. The main colour is the app's accent (buttons,
 * highlights, the menu) for everyone at the club, and the main colour in
 * graphics; the second colour is used alongside it. Club admins pick a kit
 * swatch or type the exact colour.
 */
export default function ClubColoursCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string, error?: boolean) => void }) {
  const c = useBrandColors();
  const card = useCardStyles();
  const styles = useStyles();
  const { club } = useClub();
  const [primary, setPrimary] = useState(club?.primaryColor?.toUpperCase() ?? '');
  const [secondary, setSecondary] = useState(club?.secondaryColor?.toUpperCase() ?? '');
  const [editing, setEditing] = useState<Which>('primary');
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrimary(club?.primaryColor?.toUpperCase() ?? '');
    setSecondary(club?.secondaryColor?.toUpperCase() ?? '');
  }, [club?.primaryColor, club?.secondaryColor]);

  const current = editing === 'primary' ? primary : secondary;
  const set = (hex: string) => (editing === 'primary' ? setPrimary(hex) : setSecondary(hex));
  const changed = primary !== (club?.primaryColor?.toUpperCase() ?? '') || secondary !== (club?.secondaryColor?.toUpperCase() ?? '');
  const warning = primary ? mainColourWarning(primary) : null;
  const typedHex = typed ? normaliseHex(typed) : null;

  const save = async () => {
    if (!club || !normaliseHex(primary) || !normaliseHex(secondary)) return;
    setSaving(true);
    try {
      await clubOptionsApi.setColours(primary, secondary);
      await setCurrentClub({ ...club, primaryColor: primary, secondaryColor: secondary });
      onMessage('Colours saved. Everyone sees them next time they open the app, and new graphics use them.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "The colours didn't save. Please try again."), true);
    } finally {
      setSaving(false);
    }
  };

  const slot = (which: Which, label: string, hex: string) => (
    <Pressable
      onPress={() => { setEditing(which); setTyped(''); }}
      disabled={!canManage}
      accessibilityRole="button"
      accessibilityState={{ selected: editing === which }}
      accessibilityLabel={`${label}: ${colourName(hex)}. Tap to change`}
      style={[styles.slot, editing === which && canManage ? styles.slotOn : null]}
    >
      <View style={[styles.slotSwatch, { backgroundColor: hex || 'transparent' }]} />
      <View style={styles.flex}>
        <Text style={card.body}>{label}</Text>
        <Text style={card.muted}>{colourName(hex)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SettingsCard icon="palette-outline" title="Club colours" help="Your kit colours. The main colour is used for buttons and highlights in the app for everyone at the club, and in your graphics; the second colour goes with it in graphics." testID="club-colours-card">
      <View style={styles.slots}>
        {slot('primary', 'Main colour', primary)}
        {slot('secondary', 'Second colour', secondary)}
      </View>

      {canManage ? (
        <>
          <Text style={card.sub}>Pick the {editing === 'primary' ? 'main' : 'second'} colour</Text>
          <View style={styles.swatches}>
            {KIT_COLOURS.map((k) => {
              const on = current === k.hex;
              return (
                <Pressable key={k.hex} onPress={() => set(k.hex)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={k.name}
                  style={[styles.swatch, { backgroundColor: k.hex }, on ? styles.swatchOn : null]}>
                  {on ? <MaterialCommunityIcons name="check" size={20} color={brightness(k.hex) > 0.4 ? c.background : c.text} /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.typedRow}>
            <TextInput
              mode="outlined"
              dense
              value={typed}
              onChangeText={(v) => setTyped(v.slice(0, 7))}
              placeholder="Exact colour, e.g. #FFD700"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={`Type the exact ${editing === 'primary' ? 'main' : 'second'} colour`}
              style={[card.input, styles.flex]}
            />
            <Button mode="outlined" disabled={!typedHex} onPress={() => { if (typedHex) { set(typedHex); setTyped(''); } }}>Use</Button>
          </View>
          {typed && !typedHex ? <Text style={card.muted}>Six letters and numbers after a #, like #FFD700.</Text> : null}
          {warning ? <Text style={card.locked}>{warning}</Text> : null}
          <View style={card.buttons}>
            <Button mode="contained" onPress={save} loading={saving} disabled={!changed || saving || !normaliseHex(primary) || !normaliseHex(secondary)}>Save colours</Button>
          </View>
        </>
      ) : (
        <Text style={card.locked}>Only the club&apos;s admins can change the colours.</Text>
      )}
    </SettingsCard>
  );
}

const useStyles = themedStyles((c) => ({
  flex: { flex: 1 },
  slots: { flexDirection: 'row', gap: 10 },
  slot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised, minHeight: 56 },
  slotOn: { borderColor: c.primary },
  slotSwatch: { width: 32, height: 32, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 44, height: 44, borderRadius: 999, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderColor: c.text, borderWidth: 3 },
  typedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
}));
