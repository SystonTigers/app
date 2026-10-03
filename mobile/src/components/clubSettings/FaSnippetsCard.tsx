import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type FaSnippets } from '../../services/clubSettingsApi';
import { SNIPPETS, type SnippetKind } from '../../utils/clubSettings';
import { useBrandColors } from '../../theme/brand';
import { FA_HOME } from '../faFullTime/frame';

/**
 * FA Full-Time code snippets: the FA's own league table, fixtures and results
 * in the app and on the club pages. Paste the whole snippet (or its number).
 */
export default function FaSnippetsCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string, error?: boolean) => void }) {
  const c = useBrandColors();
  const card = useCardStyles();
  const [saved, setSaved] = useState<FaSnippets | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<SnippetKind, string>>>({});
  const [busy, setBusy] = useState<SnippetKind | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    clubSettingsApi.faSnippets().then(setSaved).catch((err) => setLoadError(apiErrorMessage(err, "Your FA snippets couldn't load.")));
  }, []);
  useEffect(load, [load]);

  const save = async (kind: SnippetKind, value: string, done: string) => {
    setBusy(kind);
    try {
      setSaved(await clubSettingsApi.saveFaSnippets({ [kind]: value }));
      setDrafts((d) => ({ ...d, [kind]: '' }));
      onMessage(done);
    } catch (err) {
      onMessage(apiErrorMessage(err, "That snippet wasn't saved."), true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsCard
      icon="code-tags"
      title="FA Full-Time snippets"
      help="If your league is on FA Full-Time, the app and your club pages can show the FA's own table, fixtures and results. In Full-Time admin open Create Code Snippets, pick the type shown below, your season and division, press Create, then copy the whole code into the box."
      testID="fa-snippets-card"
    >
      <View style={card.buttons}>
        <Button mode="outlined" compact icon="open-in-new" onPress={() => Linking.openURL(FA_HOME)}>Open FA Full-Time</Button>
      </View>
      {loadError ? (
        <View>
          <Text style={card.error}>{loadError}</Text>
          <Button mode="text" onPress={load}>Try again</Button>
        </View>
      ) : !saved ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} />
      ) : (
        SNIPPETS.map((s) => {
          const code = saved[s.kind];
          const draft = drafts[s.kind] ?? '';
          return (
            <View key={s.kind} style={card.box}>
              <View style={card.row}>
                <Text style={[card.body, { fontWeight: '800', flex: 1 }]}>{s.label}</Text>
                <Text style={{ color: code ? c.success : c.textLight, fontSize: 12, fontWeight: '800' }}>{code ? 'SET' : 'NOT SET'}</Text>
              </View>
              <Text style={card.muted}>FA type: {s.faType}. Shows in {s.shows}.{code ? ` Code ${code}.` : ''}</Text>
              {canManage ? (
                <>
                  <TextInput
                    mode="outlined"
                    multiline
                    dense
                    value={draft}
                    onChangeText={(v) => setDrafts((d) => ({ ...d, [s.kind]: v }))}
                    placeholder={code ? 'Paste a new snippet to replace it' : 'Paste the code snippet here'}
                    accessibilityLabel={`${s.label} snippet`}
                    style={[card.input, { marginTop: 8, maxHeight: 120 }]}
                  />
                  <View style={card.buttons}>
                    <Button mode="contained" compact onPress={() => save(s.kind, draft, `${s.label} snippet saved.`)} loading={busy === s.kind} disabled={!!busy || !draft.trim()}>Save</Button>
                    {code ? <Button mode="text" compact onPress={() => save(s.kind, '', `${s.label} snippet removed.`)} disabled={!!busy}>Remove</Button> : null}
                  </View>
                </>
              ) : null}
            </View>
          );
        })
      )}
      {!canManage ? <Text style={card.locked}>Only the club&apos;s owner or admins can change these.</Text> : null}
    </SettingsCard>
  );
}
