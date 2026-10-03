import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Share, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import FaEmailPaste from '../FaEmailPaste';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type FixtureEmailInfo } from '../../services/clubSettingsApi';
import { emailOutcome, receivedLabel } from '../../utils/clubSettings';
import { useBrandColors } from '../../theme/brand';

const FA_SENDER = 'donotreplyfulltime@thefa.com';

/** Copy on the web, the share sheet on a phone (so it can go to Notes, email or a message). */
async function handOver(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

/**
 * Automatic fixtures: the club's private address for forwarding FA Full-Time
 * emails, how to set forwarding up, and what's arrived lately. Until the
 * address is switched on, FA emails can be pasted here instead.
 */
export default function FixtureEmailCard({ onMessage }: { onMessage: (text: string, error?: boolean) => void }) {
  const c = useBrandColors();
  const card = useCardStyles();
  const [info, setInfo] = useState<FixtureEmailInfo | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    clubSettingsApi.fixtureEmail().then(setInfo).catch((err) => setLoadError(apiErrorMessage(err, "Your forwarding address couldn't load.")));
  }, []);
  useEffect(load, [load]);

  const copy = async () => {
    if (!info?.address) return;
    const ok = await handOver(info.address);
    if (Platform.OS === 'web') onMessage(ok ? 'Address copied.' : "Couldn't copy. Press and hold the address to copy it.", !ok);
  };

  return (
    <SettingsCard
      icon="email-fast-outline"
      title="Email forwarding"
      help="Forward FA Full-Time emails to your club's own address and fixtures are added and updated by themselves: new games, moved kick-offs and postponements. Nothing else in your inbox is read, and contact details in the emails are never kept."
      testID="fixture-email-card"
    >
      {loadError ? (
        <View>
          <Text style={card.error}>{loadError}</Text>
          <Button mode="text" onPress={load}>Try again</Button>
        </View>
      ) : !info ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} />
      ) : info.address ? (
        <>
          <View style={card.box}>
            <Text style={card.mono} selectable>{info.address}</Text>
          </View>
          <View style={card.buttons}>
            <Button mode="contained" compact icon={Platform.OS === 'web' ? 'content-copy' : 'share-variant'} onPress={copy}>
              {Platform.OS === 'web' ? 'Copy address' : 'Share address'}
            </Button>
          </View>
          <Text style={[card.muted, { marginTop: 8 }]}>Keep this address private: anything sent to it can add fixtures to your club.</Text>

          <Text style={card.sub}>Gmail</Text>
          <Text style={card.muted}>1. Settings → See all settings → Forwarding and POP/IMAP → Add a forwarding address, and paste the address above.</Text>
          <Text style={card.muted}>2. Gmail sends a confirmation code to it. It appears here; type it into Gmail.</Text>
          <Text style={card.muted}>3. Create a filter: From {FA_SENDER} → Forward it to the address above.</Text>
          {info.gmailCode ? (
            <Text style={[card.body, { marginTop: 8, fontWeight: '800' }]} selectable>Gmail confirmation code: <Text style={card.mono}>{info.gmailCode}</Text></Text>
          ) : null}

          <Text style={card.sub}>Outlook / Hotmail</Text>
          <Text style={card.muted}>Settings → Mail → Rules → Add new rule. Condition: From {FA_SENDER}. Action: Redirect to the address above. Save.</Text>

          <Text style={card.sub}>Recent emails</Text>
          {info.recent.length ? info.recent.map((r, i) => (
            <View key={`${r.receivedAt}-${i}`} style={{ marginTop: 6 }}>
              <Text style={card.body} numberOfLines={1}>{receivedLabel(r.receivedAt)} · {r.subject || '(no subject)'}</Text>
              <Text style={card.muted}>{emailOutcome(r)}</Text>
            </View>
          )) : <Text style={card.muted}>Nothing yet. Forwarded FA emails will show here.</Text>}
        </>
      ) : (
        <>
          <Text style={card.locked}>Coming soon: automatic forwarding switches on once Boost Huddle&apos;s email address is set up. Until then, paste FA emails here.</Text>
          <View style={{ marginTop: 10 }}>
            <FaEmailPaste onImported={() => onMessage('Fixtures updated from that email.')} />
          </View>
        </>
      )}
    </SettingsCard>
  );
}
