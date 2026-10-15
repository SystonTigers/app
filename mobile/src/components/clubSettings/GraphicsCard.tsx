import React, { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import SettingsCard, { useCardStyles } from './SettingsCard';
import GraphicPreview from './GraphicPreview';
import GraphicViewer from './GraphicViewer';
import { pickImage } from './pickImage';
import { apiErrorMessage } from '../../services/api';
import { clubSettingsApi, type SocialSettings } from '../../services/clubSettingsApi';
import { useClub } from '../../context/ClubContext';
import { WEBSITE_URL } from '../../config';
import { themedStyles } from '../../theme/brand';
import { FONTS } from '../../theme/brandFonts';

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
 * Graphics style, sponsor and opponents' badges. Each style shows its real
 * graphics (drawn with the club's own badge, colours and sponsor) rather than
 * describing them; tap one to see it full size. Premium styles are unlocked per club.
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
  // The style and graphic open full size
  const [viewing, setViewing] = useState<{ pack: string; index: number } | null>(null);
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
  const viewed = viewing ? g.packs.find((p) => p.id === viewing.pack) ?? null : null;

  /** Use this style / In use / why it can't be chosen: on each style and in the full-size view */
  const choice = (pack: (typeof g.packs)[number], wide = false) => {
    if (g.pack === pack.id) return <Text style={[styles.inUse, wide ? styles.centre : null]}>IN USE FOR YOUR POSTS</Text>;
    if (!pack.unlocked) return <Text style={[card.muted, wide ? styles.centre : null]}>Premium style. Contact Boost Huddle to unlock it for your club.</Text>;
    if (!admin) return null;
    return (
      <Button mode="contained" onPress={() => choosePack(pack.id, pack.name)} loading={busy === `pack:${pack.id}`} disabled={!!busy}
        accessibilityLabel={`Use ${pack.name} for our posts`}>
        Use this style
      </Button>
    );
  };

  return (
    <SettingsCard icon="palette-outline" title="Graphics" help="Every post gets a graphic like these, with your badge, colours and sponsor. Tap one to see it full size." testID="graphics-card">
      {lockedChoice ? (
        <Text style={card.locked}>Your chosen premium style is locked, so posts use {g.packs.find((p) => p.id === g.activePack)?.name} for now.</Text>
      ) : null}
      {g.packs.map((pack) => {
        const current = g.pack === pack.id;
        return (
          <View key={pack.id} style={[card.box, current && styles.current]}>
            <View style={card.row}>
              <Text style={styles.packName}>{pack.name}</Text>
              {pack.premium ? <Text style={styles.premium}>PREMIUM</Text> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} accessibilityLabel={`${pack.name} graphics`}>
              {SAMPLES.map(([sample, label], index) => (
                <GraphicPreview key={sample} pack={pack.id} sample={sample} label={label} version={version} onPress={() => setViewing({ pack: pack.id, index })} />
              ))}
            </ScrollView>
            <View style={styles.choice}>{choice(pack)}</View>
          </View>
        );
      })}
      <GraphicViewer
        pack={viewed}
        samples={SAMPLES}
        index={viewing?.index ?? 0}
        version={version}
        onIndex={(index) => setViewing((v) => (v ? { ...v, index } : v))}
        onClose={() => setViewing(null)}
        action={viewed ? choice(viewed, true) : null}
      />

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
  current: { borderColor: c.primary, borderWidth: 2 },
  packName: { color: c.text, fontFamily: FONTS.display, fontSize: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
  strip: { marginTop: 10, marginHorizontal: -4 },
  choice: { marginTop: 10, alignItems: 'flex-start' },
  centre: { textAlign: 'center' },
  premium: { color: c.warning, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  inUse: { color: c.success, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  logo: { width: 96, height: 40, backgroundColor: '#FFFFFF', borderRadius: 6 },
}));
