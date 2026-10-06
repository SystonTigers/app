import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { apiClient, apiErrorMessage } from '../../services/api';

interface StreamSettings {
  youtube: { connected: boolean; channelName: string | null; needsReconnect: boolean };
  canConnect: boolean;
}

/**
 * Live match video: connect the club's YouTube channel and any stream on it
 * around kick-off pops up in the app (with a "Live now" alert) for people
 * who can't be there. Google opens in the browser; coming back refreshes
 * this card. Same as the website's Settings → Live match video.
 */
export default function LiveVideoCard({ onMessage }: { onMessage: (text: string, error?: boolean) => void }) {
  const styles = useCardStyles();
  const [settings, setSettings] = useState<StreamSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSettings((await apiClient.get('/api/v1/stream/settings')).data?.data as StreamSettings);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    load();
    // Back from Google: show the new state
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  const connect = async () => {
    // Browsers only allow a new tab straight from the tap, so open it now and point it at Google once we have the link
    const tab = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (tab) tab.opener = null;
    setBusy(true);
    try {
      const url = (await apiClient.post('/api/v1/stream/youtube/start', { from: 'app' })).data.data.url as string;
      if (tab) tab.location.href = url; else await Linking.openURL(url);
      onMessage('Sign in with the Google account that owns your club’s YouTube channel, then come back here.');
    } catch (err) {
      tab?.close();
      onMessage(apiErrorMessage(err, "We couldn't start connecting to YouTube."), true);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => Alert.alert('Disconnect YouTube?', 'Streams won’t show in the app by themselves. Managers can still paste a stream link in Match Centre.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        setSettings((await apiClient.delete('/api/v1/stream/youtube')).data?.data as StreamSettings);
        onMessage('YouTube disconnected.');
      } catch (err) {
        onMessage(apiErrorMessage(err, "We couldn't disconnect. Please try again."), true);
      } finally {
        setBusy(false);
      }
    } },
  ]);

  const help = 'Stream from your camera (XbotGo, phone or any camera that streams) to your club’s YouTube channel. The video pops up in the app for people who can’t be there. Set streams to Unlisted in YouTube, and only stream matches where parents agreed to filming.';
  if (!settings) {
    return (
      <SettingsCard icon="youtube" title="Live match video" help={help}>
        <Text style={styles.muted}>{failed ? "Live video settings didn't load. Pull down to try again." : 'Loading…'}</Text>
      </SettingsCard>
    );
  }
  const yt = settings.youtube;
  return (
    <SettingsCard icon="youtube" title="Live match video" help={help}>
      {yt.connected ? (
        <>
          <Text style={styles.body}>Connected to <Text style={{ fontWeight: '800' }}>{yt.channelName ?? 'your channel'}</Text>. Anything live on it from 45 minutes before kick-off shows in the app by itself.</Text>
          {yt.needsReconnect ? <Text style={[styles.body, { marginTop: 8, fontWeight: '700' }]}>YouTube stopped accepting the connection (the password may have changed or access was removed). Connect again to keep streams appearing.</Text> : null}
          <View style={styles.buttons}>
            {yt.needsReconnect ? <Button mode="contained" icon="youtube" onPress={connect} disabled={busy}>Connect again</Button> : null}
            <Button mode="outlined" onPress={disconnect} disabled={busy}>Disconnect</Button>
          </View>
        </>
      ) : settings.canConnect ? (
        <>
          <Text style={styles.muted}>We only ask to see your channel&apos;s streams. We can&apos;t upload, change or delete anything.</Text>
          <View style={styles.buttons}>
            <Button mode="contained" icon="youtube" onPress={connect} loading={busy} disabled={busy}>Connect YouTube</Button>
          </View>
        </>
      ) : <Text style={styles.muted}>Connecting YouTube isn&apos;t switched on yet.</Text>}
      <Text style={[styles.muted, { marginTop: 10 }]}>No YouTube connection? Paste the stream&apos;s link under Live video in Match Centre on match day.</Text>
    </SettingsCard>
  );
}
