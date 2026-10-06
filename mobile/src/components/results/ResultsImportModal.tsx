import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';
import { apiErrorMessage, resultsApi, type ResultsImportPlan } from '../../services/api';
import { importSummary, outcome, resultDate } from '../../utils/results';

type Picked = { fileName: string; data: string };

/** The picked file as base64 (works for Excel and CSV, on phones and the web app). */
async function readAsBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.readAsDataURL(blob);
  });
}

const STATUS_LABEL: Record<string, string> = { new: 'New', update: 'Update', unchanged: 'Added', exists: 'Already in app' };

/**
 * Staff: upload old results from the manager's spreadsheet (Excel or CSV, any
 * column order, one sheet per season is fine). Shows what will happen first;
 * nothing is saved until they tap Add. Results already in the app (Match
 * Centre or added by hand) are never changed.
 */
export default function ResultsImportModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [file, setFile] = useState<Picked | null>(null);
  const [plan, setPlan] = useState<ResultsImportPlan | null>(null);
  const [busy, setBusy] = useState<'' | 'reading' | 'saving'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) { setFile(null); setPlan(null); setError(''); setBusy(''); }
  }, [visible]);

  const choose = async () => {
    setError('');
    try {
      const doc = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (doc.canceled || !doc.assets?.length) return;
      const asset = doc.assets[0];
      setBusy('reading');
      setPlan(null);
      const picked = { fileName: asset.name, data: await readAsBase64(asset.uri) };
      setFile(picked);
      const res = await resultsApi.previewImport(picked);
      setPlan(res.data);
    } catch (err) {
      setFile(null);
      setError(apiErrorMessage(err, "Couldn't read that file. Save it as .xlsx or .csv and try again."));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    if (!file) return;
    setBusy('saving');
    setError('');
    try {
      const res = await resultsApi.saveImport(file);
      const { added, updated, unmatchedNames } = res.data;
      const parts = [added ? `${added} result${added === 1 ? '' : 's'} added` : '', updated ? `${updated} updated` : ''].filter(Boolean);
      const missing = unmatchedNames.length ? ` Goals by ${unmatchedNames.length} player${unmatchedNames.length === 1 ? '' : 's'} not in the squad aren't counted yet.` : '';
      onSaved(`${parts.join(', ') || 'Nothing new to add'}.${missing}`);
    } catch (err) {
      setError(apiErrorMessage(err, "That didn't save. Check your signal and try again."));
    } finally {
      setBusy('');
    }
  };

  const toSave = plan ? plan.counts.new + plan.counts.update : 0;
  const shown = plan ? plan.results.filter((r) => r.status !== 'exists') : [];

  return (
    <Portal>
      <Modal visible={visible} onDismiss={busy ? undefined : onClose} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>UPLOAD A SPREADSHEET</Text>

          {!plan && busy !== 'reading' ? (
            <View style={styles.block}>
              <Text style={styles.body}>
                Add results from old seasons in one go, straight from the manager&apos;s spreadsheet. Excel (.xlsx) or CSV, with one sheet per season if you like.
              </Text>
              <Text style={styles.body}>
                It needs columns for the <Text style={styles.strong}>date</Text>, <Text style={styles.strong}>who you played</Text> and the <Text style={styles.strong}>score</Text>. Home or away, competition and goalscorers are read too if they&apos;re there. Column names and order don&apos;t matter.
              </Text>
              <Text style={styles.hint}>You&apos;ll see everything before it&apos;s saved. Results already in the app stay as they are.</Text>
            </View>
          ) : null}

          {busy === 'reading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={c.primary} />
              <Text style={styles.hint}>Reading {file?.fileName ?? 'your spreadsheet'}…</Text>
            </View>
          ) : null}

          {plan ? (
            <View style={styles.block}>
              <Text style={styles.fileName} numberOfLines={1}>{file?.fileName}</Text>
              <Text style={styles.summary}>{importSummary(plan.counts)}</Text>

              {plan.unmatchedNames.length ? (
                <View style={styles.warn}>
                  <Text style={styles.warnTitle}>Not in the squad</Text>
                  <Text style={styles.body}>
                    {plan.unmatchedNames.map((u) => `${u.name}${u.goals > 1 ? ` (${u.goals})` : ''}`).join(', ')}
                  </Text>
                  <Text style={styles.hint}>
                    Their goals are kept on the result but don&apos;t count in anyone&apos;s stats yet. Add them in Manage Squad (old players too), then upload the same file again to fill them in.
                  </Text>
                </View>
              ) : null}

              {shown.map((r) => {
                const o = outcome(r.ourScore, r.theirScore);
                const colour = o === 'W' ? c.success : o === 'D' ? c.warning : c.error;
                return (
                  <View key={`${r.date}-${r.opponent}`} style={styles.row}>
                    <View style={[styles.badge, { backgroundColor: colour }]}><Text style={styles.badgeText}>{o}</Text></View>
                    <View style={styles.rowMain}>
                      <Text style={styles.opponent} numberOfLines={1}>{r.homeAway === 'away' ? 'at ' : 'v '}{r.opponent}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{resultDate(r.date)} · {r.competition}{r.status !== 'new' ? ` · ${STATUS_LABEL[r.status]}` : ''}</Text>
                      {r.scorersText ? <Text style={styles.meta} numberOfLines={2}>⚽ {r.scorersText}{r.tooMany ? ' (more scorers than goals, check this)' : ''}</Text> : null}
                    </View>
                    <Text style={styles.score}>{r.ourScore}–{r.theirScore}</Text>
                  </View>
                );
              })}

              {plan.skipped.length ? (
                <View style={styles.block}>
                  <Text style={styles.warnTitle}>Skipped</Text>
                  {plan.skipped.slice(0, 30).map((s) => <Text key={s.where + s.reason} style={styles.hint}>{s.where}: {s.reason}</Text>)}
                  {plan.skipped.length > 30 ? <Text style={styles.hint}>…and {plan.skipped.length - 30} more.</Text> : null}
                </View>
              ) : null}
              {plan.ignoredSheets.length ? (
                <Text style={styles.hint}>Sheets left out: {plan.ignoredSheets.map((s) => s.name).join(', ')} (no date, opponent and score columns).</Text>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

          <View style={styles.buttons}>
            {plan && toSave > 0 ? (
              <Button mode="contained" onPress={save} loading={busy === 'saving'} disabled={!!busy} accessibilityLabel={`Add ${toSave} results`}>
                {plan.counts.new ? `Add ${plan.counts.new} result${plan.counts.new === 1 ? '' : 's'}` : `Update ${toSave}`}
              </Button>
            ) : null}
            <Button mode={plan ? 'outlined' : 'contained'} onPress={choose} disabled={!!busy} icon="file-upload-outline">
              {plan ? 'Choose a different file' : 'Choose spreadsheet'}
            </Button>
            <Button mode="text" onPress={onClose} disabled={busy === 'saving'}>{plan && toSave === 0 ? 'Done' : 'Cancel'}</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const useStyles = themedStyles((c) => ({
  modal: { backgroundColor: c.surface, margin: 16, borderRadius: 18, borderWidth: 1, borderColor: c.border, maxHeight: '90%' },
  content: { padding: 18, gap: 14 },
  title: { color: c.text, fontFamily: FONTS.display, fontSize: 24, letterSpacing: 1 },
  block: { gap: 10 },
  body: { color: c.text, lineHeight: 21 },
  strong: { fontWeight: '800' },
  hint: { color: c.textLight, fontSize: 13, lineHeight: 19 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  fileName: { color: c.textLight, fontSize: 12, fontWeight: '700' },
  summary: { color: c.text, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  warn: { gap: 6, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: c.warning, backgroundColor: c.surfaceRaised },
  warnTitle: { color: c.text, fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  badge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#06080B', fontWeight: '900' },
  rowMain: { flex: 1, gap: 2 },
  opponent: { color: c.text, fontWeight: '800' },
  meta: { color: c.textLight, fontSize: 12 },
  score: { color: c.text, fontFamily: FONTS.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  error: { color: c.error },
  buttons: { gap: 8 },
}));
