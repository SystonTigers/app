import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Switch } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type SocialSettings } from '../../services/clubSettingsApi';
import { changedKinds, CLUB_POSTS, MATCH_POSTS, NAME_STYLES, toggleEvent, type NameStyle, type PostEvents } from '../../utils/clubSettings';
import { themedStyles } from '../../theme/brand';

/**
 * How players appear in public, and which updates post where: the club app
 * feed, and Facebook/Instagram. Managers can change the name style; the rest
 * is for club admins.
 */
export default function PostingCard({ settings, onSaved, onMessage }: {
  settings: SocialSettings;
  onSaved: (next: SocialSettings) => void;
  onMessage: (text: string, error?: boolean) => void;
}) {
  const card = useCardStyles();
  const styles = useStyles();
  const [draft, setDraft] = useState<PostEvents>(settings.events);
  const [busy, setBusy] = useState<string | null>(null);
  const admin = settings.canManage;
  const changed = changedKinds(settings.events, draft);

  // Only a real change from the server (a refresh after someone else saved) replaces unsaved ticks
  const savedKey = JSON.stringify(settings.events);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(settings.events), [savedKey]);

  const save = async (what: string, work: () => Promise<SocialSettings | void>, done: string, fallback: string) => {
    setBusy(what);
    try {
      const next = await work();
      if (next) onSaved(next);
      onMessage(done);
    } catch (err) {
      onMessage(apiErrorMessage(err, fallback), true);
    } finally {
      setBusy(null);
    }
  };

  const nameStyle = (style: NameStyle) => save('names', () => clubSettingsApi.saveSocial({ nameStyle: style }), 'Saved. New posts use this name style.', "That didn't save.");
  const photos = (on: boolean) => save('photos', async () => {
    await clubSettingsApi.savePublicPhotos(on);
    onSaved({ ...settings, photos: on });
  }, on ? 'Photos switched on (only players with consent).' : 'Photos switched off.', "That didn't save.");
  const undoWindow = (on: boolean) => save('undo', () => clubSettingsApi.saveSocial({ undoWindow: on }), on ? 'Posts now wait 1 minute.' : 'Posts now go out straight away.', "That didn't save.");
  const saveEvents = () => save('events', () => clubSettingsApi.saveSocial({ events: draft }), 'Posting choices saved.', "Your posting choices didn't save.");

  const group = (title: string, kinds: typeof MATCH_POSTS) => (
    <View key={title}>
      <Text style={styles.group}>{title}</Text>
      {kinds.map(([kind, label]) => (
        <View key={kind} style={styles.line}>
          <Text style={styles.label}>{label}</Text>
          {(['feed', 'social'] as const).map((where) => (
            <View key={where} style={styles.cell}>
              <Switch
                value={draft[kind]?.[where] ?? false}
                disabled={!admin || !!busy}
                onValueChange={(on) => setDraft((d) => toggleEvent(d, kind, where, on))}
                accessibilityLabel={`${label}: ${where === 'feed' ? 'club app' : 'Facebook and Instagram'}`}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <SettingsCard
      icon="send-clock-outline"
      title="What gets posted"
      help="Anyone can see your club pages and social posts. Only show full names or photos if parents have agreed. People in your app always see full names."
      testID="posting-card"
    >
      <Text style={card.sub}>Show players&apos; names as</Text>
      <View style={card.row}>
        {NAME_STYLES.map(([value, label]) => (
          <Chip key={value} selected={settings.nameStyle === value} showSelectedCheck={false} mode={settings.nameStyle === value ? 'flat' : 'outlined'}
            disabled={!!busy} onPress={() => nameStyle(value)} accessibilityLabel={`Names as ${label}`}>
            {label}
          </Chip>
        ))}
      </View>

      <View style={styles.toggle}>
        <Text style={[card.body, { flex: 1 }]}>Show players&apos; photos on goal graphics and the club page (only players whose parents said yes)</Text>
        <Switch value={settings.photos} disabled={!admin || !!busy} onValueChange={photos} accessibilityLabel="Show players' photos" />
      </View>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={card.body}>Wait 1 minute before posting and sending match alerts</Text>
          <Text style={card.muted}>So a mistake can be undone in Match Centre. Instagram doesn&apos;t let apps delete posts.</Text>
        </View>
        <Switch value={settings.undoWindow} disabled={!admin || !!busy} onValueChange={undoWindow} accessibilityLabel="Wait 1 minute before posting" />
      </View>

      <View style={[styles.line, styles.header]}>
        <Text style={[styles.label, card.muted]}>When</Text>
        <Text style={[styles.cell, styles.colTitle]}>Club app</Text>
        <Text style={[styles.cell, styles.colTitle]}>Facebook / Instagram</Text>
      </View>
      {group('During matches', MATCH_POSTS)}
      {group('Club posts', CLUB_POSTS)}

      {admin ? (
        <View style={card.buttons}>
          <Button mode="contained" onPress={saveEvents} disabled={!!busy || !changed.length} loading={busy === 'events'}>
            {changed.length ? `Save posting choices (${changed.length})` : 'Posting choices saved'}
          </Button>
          {changed.length ? <Button mode="text" onPress={() => setDraft(settings.events)} disabled={!!busy}>Undo changes</Button> : null}
        </View>
      ) : (
        <Text style={card.locked}>Only the club&apos;s owner or admins can change photos and what gets posted.</Text>
      )}
    </SettingsCard>
  );
}

const useStyles = themedStyles((c) => ({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  header: { marginTop: 18, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 6 },
  group: { color: c.textLight, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 2 },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border },
  label: { flex: 1, color: c.text, fontSize: 14, paddingRight: 8 },
  cell: { width: 84, alignItems: 'center' },
  colTitle: { color: c.textLight, fontSize: 11, fontWeight: '700', textAlign: 'center' },
}));
