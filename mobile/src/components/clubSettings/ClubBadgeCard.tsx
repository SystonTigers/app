import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import Crest from '../home/Crest';
import SettingsCard, { useCardStyles } from './SettingsCard';
import { pickImage } from './pickImage';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi } from '../../services/clubSettingsApi';
import { useClub } from '../../context/ClubContext';
import { useBrandColors } from '../../theme/brand';

/**
 * The club's own badge: in the app, on the club pages and on every graphic.
 * Uploading updates this phone straight away; others see it next time they open the app.
 */
export default function ClubBadgeCard({ canManage, onMessage }: { canManage: boolean; onMessage: (text: string, error?: boolean) => void }) {
  const c = useBrandColors();
  const styles = useCardStyles();
  const { club, chooseClub } = useClub();
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const badgeUrl = club?.badgeUrl ?? null;

  const setBadge = async (url: string | null) => {
    if (club) await chooseClub({ ...club, badgeUrl: url });
  };

  const upload = async () => {
    const picked = await pickImage().catch(() => ({ problem: "We couldn't open your photos. Please try again." }));
    if (!picked) return;
    if ('problem' in picked) return onMessage(picked.problem, true);
    setBusy('upload');
    try {
      await setBadge(await clubSettingsApi.uploadBadge(picked.image));
      onMessage('Badge saved. New posts and graphics use it.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "The badge didn't upload. Please try again."), true);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await clubSettingsApi.removeBadge();
      await setBadge(null);
      onMessage('Badge removed. Your club\'s initials are shown instead.');
    } catch (err) {
      onMessage(apiErrorMessage(err, "The badge wasn't removed. Please try again."), true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsCard
      icon="shield-star-outline"
      title="Club badge"
      help="Shown in the app, on your club pages and on every graphic posted to the app, Facebook and Instagram. A PNG with a see-through background looks best."
      testID="club-badge-card"
    >
      <View style={[styles.row, { gap: 16 }]}>
        <View style={[styles.box, { marginTop: 0, padding: 10 }]}>
          <Crest name={club?.name || 'Club'} color={c.primary} badgeUrl={badgeUrl} size={84} />
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text style={styles.body}>{badgeUrl ? 'Your badge is on everything.' : 'No badge yet, so we show your club\'s initials.'}</Text>
          {canManage ? (
            <View style={styles.buttons}>
              <Button mode="contained" icon="upload" onPress={upload} loading={busy === 'upload'} disabled={!!busy} accessibilityLabel={badgeUrl ? 'Change badge' : 'Upload badge'}>
                {badgeUrl ? 'Change' : 'Upload badge'}
              </Button>
              {badgeUrl ? (
                <Button mode="outlined" onPress={remove} loading={busy === 'remove'} disabled={!!busy} accessibilityLabel="Remove badge">Remove</Button>
              ) : null}
            </View>
          ) : (
            <Text style={styles.locked}>Only the club&apos;s owner or admins can change the badge.</Text>
          )}
        </View>
      </View>
    </SettingsCard>
  );
}
