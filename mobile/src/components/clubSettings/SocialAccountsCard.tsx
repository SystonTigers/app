import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { Button, RadioButton } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type SocialSettings } from '../../services/clubSettingsApi';

/**
 * Facebook and Instagram: connect the club's Page (its linked Instagram
 * business account comes with it). Facebook opens in the browser; when the
 * manager comes back, the screen refreshes and shows the result, or the
 * Pages to choose from if they run more than one.
 */
export default function SocialAccountsCard({ settings, onSaved, onMessage }: {
  settings: SocialSettings;
  onSaved: (next: SocialSettings) => void;
  onMessage: (text: string, error?: boolean) => void;
}) {
  const styles = useCardStyles();
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState('');
  const fb = settings.connections.facebook;
  const ig = settings.connections.instagram;
  const choice = settings.pendingChoice;

  const run = async (work: () => Promise<SocialSettings | void>, done: string | null, fallback: string) => {
    setBusy(true);
    try {
      const next = await work();
      if (next) onSaved(next);
      if (done) onMessage(done);
    } catch (err) {
      onMessage(apiErrorMessage(err, fallback), true);
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    // Browsers only allow a new tab straight from the tap, so open it now and point it at Facebook once we have the link
    const tab = Platform.OS === 'web' && typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (tab) tab.opener = null;
    return run(async () => {
      try {
        const url = await clubSettingsApi.startFacebook();
        if (tab) tab.location.href = url;
        else await Linking.openURL(url);
      } catch (err) {
        tab?.close();
        throw err;
      }
    }, 'Log in to Facebook, then come back here.', "We couldn't start connecting to Facebook.");
  };

  const choose = () => choice && run(() => clubSettingsApi.choosePage(choice.key, chosen), 'Facebook and Instagram are connected.', "We couldn't connect that Page. Tap Connect to try again.");

  const disconnect = () => Alert.alert(
    'Disconnect Facebook?',
    'Nothing more will be posted to Facebook or Instagram. Posts still go to your club app.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => run(() => clubSettingsApi.disconnectFacebook(), 'Disconnected from Facebook and Instagram.', "We couldn't disconnect. Please try again.") },
    ],
  );

  let body: React.ReactNode;
  if (fb) {
    body = (
      <>
        <Text style={styles.body}>
          Posting to the Facebook Page <Text style={{ fontWeight: '800' }}>{fb.name ?? fb.id}</Text>
          {ig ? <Text> and Instagram <Text style={{ fontWeight: '800' }}>@{ig.name ?? ig.id}</Text>.</Text> : '.'}
        </Text>
        {!ig ? <Text style={[styles.muted, { marginTop: 6 }]}>No Instagram business account is linked to that Page, so nothing goes to Instagram.</Text> : null}
        {settings.canManage ? (
          <View style={styles.buttons}>
            <Button mode="outlined" onPress={disconnect} disabled={busy}>Disconnect</Button>
          </View>
        ) : null}
      </>
    );
  } else if (choice && settings.canManage) {
    body = (
      <>
        <Text style={styles.body}>You run more than one Facebook Page. Choose your club&apos;s:</Text>
        <RadioButton.Group value={chosen} onValueChange={setChosen}>
          {choice.pages.map((p) => (
            <Pressable key={p.id} onPress={() => setChosen(p.id)} style={[styles.row, { marginTop: 6 }]} accessibilityRole="radio" accessibilityState={{ checked: chosen === p.id }}>
              <RadioButton value={p.id} />
              <Text style={[styles.body, { flex: 1 }]}>{p.name}{p.instagram ? ` (Instagram @${p.instagram})` : ''}</Text>
            </Pressable>
          ))}
        </RadioButton.Group>
        <View style={styles.buttons}>
          <Button mode="contained" onPress={choose} disabled={busy || !chosen} loading={busy}>Connect this Page</Button>
        </View>
      </>
    );
  } else {
    body = (
      <>
        <Text style={styles.body}>Connect your club&apos;s Facebook Page to post match updates and club posts automatically. If an Instagram business account is linked to the Page, posts go there too.</Text>
        {!settings.canConnect ? (
          <Text style={styles.locked}>Facebook and Instagram posting isn&apos;t switched on yet. Posts still go to your club app.</Text>
        ) : settings.canManage ? (
          <View style={styles.buttons}>
            <Button mode="contained" icon="facebook" onPress={connect} disabled={busy} loading={busy}>Connect Facebook &amp; Instagram</Button>
          </View>
        ) : (
          <Text style={styles.locked}>Only the club&apos;s owner or admins can connect Facebook.</Text>
        )}
      </>
    );
  }

  return (
    <SettingsCard icon="share-variant-outline" title="Social media" testID="social-accounts-card">
      {body}
      <Text style={[styles.muted, { marginTop: 12 }]}>TikTok: use Share next to each update in Match Centre until TikTok approves automatic posting.</Text>
    </SettingsCard>
  );
}
