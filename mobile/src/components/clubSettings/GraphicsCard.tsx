import React, { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import GraphicPreview from './GraphicPreview';
import { pickImage } from './pickImage';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type SocialSettings } from '../../services/clubSettingsApi';
import { useClub } from '../../context/ClubContext';
import { WEBSITE_URL } from '../../config';
import { themedStyles } from '../../theme/brand';

const SAMPLES: Array<[string, string]> = [
  ['goal', 'Goal'],
  ['fulltime', 'Full time'],
  ['matchday', 'Match day'],
  ['lineup', 'Line-up'],
  ['fixtures', 'Fixtures'],
  ['table', 'League table'],
  ['countdown', 'Countdown'],
  ['motm', 'Man of the Match'],
];

/**
 * Graphics style, sponsor and opponents' badges. Styles are previewed with
 * the club's own badge, colours and sponsor; premium styles are unlocked per club.
 */
export default function GraphicsCard({ settings, onSaved, onMessage }: {
  settings: SocialSettings;
  onSaved: (next: SocialSettings) => void;
  onMessage: (text: string, error?: boolean) => void;
}) {
  const card = useCardStyles();
  const styles = useStyles();
  const { club } = useClub();
  const g = settings.graphics;
  const admin = settings.canManage;
  const [open, setOpen] = useState<string>('');
  const [sponsor, setSponsor] = useState(g.sponsorName ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  // Previews redraw when the badge or sponsor changes
  const version = `${club?.badgeUrl ?? ''}|${g.sponsorName ?? ''}|${g.sponsorLogoUrl ?? ''}`;

  useEffect(() => setSponsor(g.sponsorName ?? ''), [g.sponsorName]);

  const run = async (what: string, work: () => Promise<SocialSettings | void>, done: string, fallback: string) => {
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

  const choosePack = (id: string, name: string) => run(`pack:${id}`, () => clubSettingsApi.saveSocial({ pack: id }), `${name} is now your graphics style.`, "That style wasn't saved.");
  const saveSponsor = () => run('sponsor', () => clubSettingsApi.saveSocial({ sponsorName: sponsor.trim() || null }), sponsor.trim() ? 'Sponsor saved.' : 'Sponsor removed.', "The sponsor wasn't saved.");

  const uploadLogo = async () => {
    const picked = await pickImage().catch(() => ({ problem: "We couldn't open your photos. Please try again." }));
    if (!picked) return;
    if ('problem' in picked) return onMessage(picked.problem, true);
    await run('logo', async () => {
      const url = await clubSettingsApi.uploadSponsorLogo(picked.image);
      onSaved({ ...settings, graphics: { ...g, sponsorLogoUrl: url } });
    }, 'Sponsor logo saved. It appears on every graphic.', "The logo didn't upload. Please try again.");
  };
  const removeLogo = () => run('logo', async () => {
    await clubSettingsApi.removeSponsorLogo();
    onSaved({ ...settings, graphics: { ...g, sponsorLogoUrl: null } });
  }, 'Sponsor logo removed.', "The logo wasn't removed.");

  const lockedChoice = g.pack !== g.activePack;

  return (
    <SettingsCard icon="palette-outline" title="Graphics" help="Every post gets a graphic in your club's colours with both teams' badges. The examples use your own club details." testID="graphics-card">
      {lockedChoice ? (
        <Text style={card.locked}>Your chosen premium style is locked, so posts use {g.packs.find((p) => p.id === g.activePack)?.name} for now.</Text>
      ) : null}
      {g.packs.map((pack) => {
        const current = g.pack === pack.id;
        return (
          <View key={pack.id} style={[card.box, current && styles.current]}>
            <View style={card.row}>
              <Text style={[card.body, { fontWeight: '800' }]}>{pack.name}</Text>
              {pack.premium ? <Text style={styles.premium}>PREMIUM</Text> : null}
              {current ? <Text style={styles.inUse}>IN USE</Text> : null}
            </View>
            <Text style={card.muted}>{pack.description}</Text>
            <View style={card.buttons}>
              <Button mode="outlined" compact onPress={() => setOpen(open === pack.id ? '' : pack.id)} accessibilityState={{ expanded: open === pack.id }}>
                {open === pack.id ? 'Hide examples' : 'See examples'}
              </Button>
              {!current && admin && pack.unlocked ? (
                <Button mode="contained" compact onPress={() => choosePack(pack.id, pack.name)} loading={busy === `pack:${pack.id}`} disabled={!!busy}>Use this style</Button>
              ) : null}
            </View>
            {!current && !pack.unlocked ? <Text style={[card.muted, { marginTop: 6 }]}>One-off purchase. Contact Boost Huddle to unlock it for your club.</Text> : null}
            {open === pack.id ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {SAMPLES.map(([sample, label]) => <GraphicPreview key={sample} pack={pack.id} sample={sample} label={label} version={version} />)}
              </ScrollView>
            ) : null}
          </View>
        );
      })}

      <Text style={card.sub}>Sponsor</Text>
      <Text style={card.muted}>Shown at the bottom of every graphic. A logo looks best; without one we show the sponsor&apos;s name.</Text>
      <TextInput mode="outlined" label="Sponsor's name" value={sponsor} onChangeText={setSponsor} maxLength={60} disabled={!admin} placeholder="e.g. Cherry Tree Nursery" style={card.input} accessibilityLabel="Sponsor's name" />
      <View style={card.buttons}>
        {g.sponsorLogoUrl ? <Image source={{ uri: g.sponsorLogoUrl }} style={styles.logo} resizeMode="contain" accessibilityLabel="Sponsor logo" /> : null}
        {admin ? (
          <>
            <Button mode="contained" compact onPress={saveSponsor} loading={busy === 'sponsor'} disabled={!!busy || sponsor.trim() === (g.sponsorName ?? '')}>Save sponsor</Button>
            <Button mode="outlined" compact icon="upload" onPress={uploadLogo} loading={busy === 'logo'} disabled={!!busy}>{g.sponsorLogoUrl ? 'Change logo' : 'Upload logo'}</Button>
            {g.sponsorLogoUrl ? <Button mode="text" compact onPress={removeLogo} disabled={!!busy}>Remove logo</Button> : null}
          </>
        ) : null}
      </View>
      {!admin ? <Text style={card.locked}>Only the club&apos;s owner or admins can change the style or sponsor.</Text> : null}

      <Text style={card.sub}>Opponents&apos; badges</Text>
      <Text style={card.muted}>Every team you play is listed on the website&apos;s Opponents page. Upload each badge once and it&apos;s used on every graphic; until then we show their initials.</Text>
      {club?.slug ? (
        <View style={card.buttons}>
          <Button mode="outlined" compact icon="open-in-new" onPress={() => Linking.openURL(`${WEBSITE_URL}/${club.slug}/admin/opponents`)}>Opponents on the website</Button>
        </View>
      ) : null}
    </SettingsCard>
  );
}

const useStyles = themedStyles((c) => ({
  current: { borderColor: c.primary },
  premium: { color: c.warning, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  inUse: { color: c.success, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  logo: { width: 96, height: 40, backgroundColor: '#FFFFFF', borderRadius: 6 },
}));
