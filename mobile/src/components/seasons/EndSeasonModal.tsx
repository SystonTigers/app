import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, IconButton, Modal, Portal, TextInput } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import PlayerPicker, { type PickablePlayer } from '../live/PlayerPicker';
import { apiErrorMessage, seasonsApi, squadApi, type ClubSeason, type SeasonPreview } from '../../services/api';

type Award = { customName: string; player: PickablePlayer };

/**
 * Staff: end a season. Shows how it went (results and leaders by the
 * season's dates), lets them add the club's awards, then archives it. Top
 * scorer and most assists are awarded automatically.
 */
export default function EndSeasonModal({ season, onClose, onEnded }: { season: ClubSeason | null; onClose: () => void; onEnded: (name: string) => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [preview, setPreview] = useState<SeasonPreview | null>(null);
  const [squad, setSquad] = useState<PickablePlayer[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [awardName, setAwardName] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!season) return;
    setPreview(null); setAwards([]); setAwardName(''); setError('');
    seasonsApi.preview(season.id).then(setPreview).catch((err) => setError(apiErrorMessage(err, "This season's stats didn't load. Close this and try again.")));
    squadApi.getSquad()
      .then((res) => setSquad(((res?.data ?? []) as Array<{ id: string; name: string; number?: number | null }>).map((p) => ({ id: String(p.id), name: p.name, number: p.number ?? null }))))
      .catch(() => setSquad([]));
  }, [season]);

  const end = async () => {
    if (!season) return;
    setSaving(true); setError('');
    try {
      await seasonsApi.end(season.id, awards.map((a) => ({ awardType: 'custom', customName: a.customName, playerId: a.player.id })));
      onEnded(season.name);
    } catch (err) {
      setError(apiErrorMessage(err, "The season wasn't ended. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const s = preview?.summary;
  const tiles = s ? [['P', s.played], ['W', s.won], ['GF', s.goalsFor], ['CS', s.cleanSheets]] as const : [];
  const leaders = preview ? [
    ['Top scorer', preview.topScorer ? `${preview.topScorer.name} · ${preview.topScorer.goals}` : 'No goals recorded'],
    ['Most assists', preview.topAssister ? `${preview.topAssister.name} · ${preview.topAssister.assists}` : 'No assists recorded'],
    ['Most appearances', preview.mostAppearances ? `${preview.mostAppearances.name} · ${preview.mostAppearances.appearances}` : '—'],
    ['Man of the Match', preview.motmLeader ? `${preview.motmLeader.name} · ${preview.motmLeader.count}` : '—'],
  ] : [];

  return (
    <Portal>
      <Modal visible={!!season} onDismiss={saving ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>END {season?.name?.toUpperCase()}</Text>
          <Text style={styles.hint}>This archives the season and keeps its stats as they are. You can reopen it within a day if you change your mind.</Text>
          {!preview && !error ? <ActivityIndicator color={c.primary} style={styles.loading} /> : null}
          {preview ? (
            <>
              <View style={styles.tiles}>
                {tiles.map(([k, v]) => (
                  <View key={k} style={styles.tile}><Text style={[styles.tileValue, { color: c.primary }]}>{v}</Text><Text style={styles.tileLabel}>{k}</Text></View>
                ))}
              </View>
              {leaders.map(([k, v]) => (
                <View key={k} style={styles.row}><Text style={styles.rowLabel}>{k}</Text><Text style={styles.rowValue} numberOfLines={1}>{v}</Text></View>
              ))}
              <Text style={styles.section}>SEASON AWARDS</Text>
              {awards.map((a, i) => (
                <View key={`${a.customName}-${i}`} style={styles.award}>
                  <Text style={styles.awardText} numberOfLines={2}><Text style={styles.strong}>{a.customName}</Text> · {a.player.name}</Text>
                  <IconButton icon="close" size={18} onPress={() => setAwards(awards.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${a.customName}`} />
                </View>
              ))}
              <TextInput mode="outlined" label="Award (e.g. Players' Player)" value={awardName} onChangeText={setAwardName} />
              <Button mode="outlined" icon="account-plus" onPress={() => setPicking(true)} disabled={!awardName.trim()}>Pick the winner</Button>
              <Text style={styles.hint}>Top scorer and most assists are added for you.</Text>
            </>
          ) : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <View style={styles.buttons}>
            <Button mode="contained" buttonColor={c.error} textColor="#FFFFFF" onPress={end} loading={saving} disabled={saving || !preview}>End and archive season</Button>
            <Button mode="text" onPress={onClose} disabled={saving}>Cancel</Button>
          </View>
        </ScrollView>
        <PlayerPicker
          visible={picking}
          title={`Who won ${awardName.trim() || 'the award'}?`}
          players={squad}
          onPick={(player) => { setAwards([...awards, { customName: awardName.trim(), player }]); setAwardName(''); setPicking(false); }}
          onCancel={() => setPicking(false)}
          onDismiss={() => setPicking(false)}
        />
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '92%' },
  content: { padding: 18, gap: 12 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1 },
  hint: { color: c.textLight, fontSize: 13, lineHeight: 19 },
  loading: { marginVertical: 20 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border },
  tileValue: { fontFamily: FONTS.display, fontSize: 26, fontVariant: ['tabular-nums'] },
  tileLabel: { color: c.textLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  rowLabel: { color: c.textLight, fontSize: 13, fontWeight: '700' },
  rowValue: { color: c.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  section: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: 1.5, marginTop: 6 },
  award: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: c.primary, backgroundColor: c.primarySoft, paddingLeft: 12 },
  awardText: { color: c.text, flex: 1 },
  strong: { fontWeight: '800' },
  error: { color: c.error },
  buttons: { gap: 8, marginTop: 4 },
}));
