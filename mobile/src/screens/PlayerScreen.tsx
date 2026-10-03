import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { themedStyles, useBrandColors } from '../theme/brand';
import { FONTS } from '../theme/brandFonts';
import PlayerBio from '../components/player/PlayerBio';
import PlayerPhotos from '../components/player/PlayerPhotos';
import GoalClips from '../components/player/GoalClips';
import { apiErrorMessage, playerPageApi } from '../services/api';
import { allTimeText, careerTiles, initials, type PlayerProfile } from '../utils/playerPage';
import { playerInitials, shirtNumber } from '../utils/playerNames';

/**
 * A player's page: their own bio, all-time numbers, stats for each season,
 * photos and their goals from the match videos. Photos and goal clips show
 * to the whole club once a parent has said yes (the family and staff always
 * see them).
 */
export default function PlayerScreen({ navigation, route }: { navigation: any; route: { params?: { id?: string } } }) {
  const c = useBrandColors();
  const styles = useStyles();
  const id = route.params?.id ?? '';
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return setError('Choose a player from the squad.');
    try {
      const data = await playerPageApi.profile(id);
      setProfile(data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, "This player's page couldn't load. Pull down to try again."));
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    setProfile((p) => (p?.player.id === id ? p : null));
    void load();
  }, [id, load]));

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        {error ? (
          <>
            <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
            <Button mode="contained" onPress={() => (id ? load() : navigation.navigate('Squad'))}>{id ? 'Try again' : 'Squad'}</Button>
          </>
        ) : <ActivityIndicator size="large" color={c.primary} />}
      </View>
    );
  }

  const { player } = profile;
  const firstName = player.firstName || player.name;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.primary} />}
      >
        <View style={styles.hero}>
          {player.photo ? (
            <Image source={{ uri: player.photo }} style={styles.avatar} accessibilityLabel={`Photo of ${player.name}`} />
          ) : (
            <View style={[styles.avatar, styles.initials, { backgroundColor: c.primary }]}>
              <Text style={[styles.initialsText, { color: c.onPrimary }]}>{player.firstName && player.name.startsWith(player.firstName) ? playerInitials({ first_name: player.firstName, last_name: player.name.slice(player.firstName.length).trim() }) : initials(player.name)}</Text>
            </View>
          )}
          <View style={styles.heroText}>
            {shirtNumber(player.number) ? <Text style={[styles.number, { color: c.primary }]}>#{shirtNumber(player.number)}</Text> : null}
            <Text style={styles.name} accessibilityRole="header">{player.name}</Text>
            {player.position ? <Text style={styles.position}>{player.position.toUpperCase()}</Text> : null}
          </View>
        </View>

        <View style={styles.tiles}>
          {careerTiles(profile.career).map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={[styles.tileValue, { color: c.primary }]}>{t.value}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.allTime}>{allTimeText(profile.career)}</Text>

        <Section title={profile.canEditBio ? 'About me' : `About ${firstName}`}>
          <PlayerBio
            playerId={player.id}
            firstName={firstName}
            bio={profile.bio}
            canEdit={profile.canEditBio}
            canRemove={profile.canRemoveBio}
            onSaved={(bio) => setProfile((p) => (p ? { ...p, bio } : p))}
            onMessage={setMessage}
          />
        </Section>

        <Section title="Season by season">
          <View style={[styles.seasonRow, styles.seasonHead]}>
            <Text style={[styles.seasonLabel, styles.headText]}>SEASON</Text>
            {['APPS', 'GLS', 'AST', 'MOTM'].map((h) => <Text key={h} style={[styles.seasonNum, styles.headText]}>{h}</Text>)}
          </View>
          {profile.seasons.map((s) => (
            <View key={s.id} style={styles.seasonRow} accessible accessibilityLabel={`${s.label}: ${s.appearances} appearances, ${s.goals} goals, ${s.assists} assists, ${s.motm} man of the match`}>
              <Text style={[styles.seasonLabel, s.current ? { color: c.primary, fontWeight: '800' } : null]}>{s.label}{s.current ? ' (now)' : ''}</Text>
              <Text style={styles.seasonNum}>{s.appearances}</Text>
              <Text style={styles.seasonNum}>{s.goals}</Text>
              <Text style={styles.seasonNum}>{s.assists}</Text>
              <Text style={styles.seasonNum}>{s.motm}</Text>
            </View>
          ))}
        </Section>

        <Section title="Goals on video">
          {profile.clips.length ? <GoalClips clips={profile.clips} /> : (
            <Text style={styles.note}>
              {profile.hidden.clips
                ? `${firstName}'s goal clips show here once a parent says yes to video in Photo & Video Consent.`
                : 'Goals scored in matches with a video show here, from the Match Centre goal taps.'}
            </Text>
          )}
        </Section>

        <Section title="Photos">
          {profile.photos.length ? <PlayerPhotos photos={profile.photos} name={player.name} /> : (
            <Text style={styles.note}>
              {profile.hidden.photos
                ? `${firstName}'s photos show here once a parent says yes to photos in Photo & Video Consent.`
                : profile.canRemoveBio ? 'Add photos in Manager Zone → Player Images.' : 'No photos yet.'}
            </Text>
          )}
        </Section>
      </ScrollView>
      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>{message}</Snackbar>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  errorText: { color: c.text, textAlign: 'center', fontSize: 15 },
  content: { padding: 16, paddingBottom: 56, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.surfaceRaised },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontFamily: FONTS.display, fontSize: 36 },
  heroText: { flex: 1 },
  number: { fontFamily: FONTS.display, fontSize: 22, lineHeight: 24 },
  name: { color: c.text, fontFamily: FONTS.display, fontSize: 32, lineHeight: 36, letterSpacing: 0.4 },
  position: { color: c.textLight, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tile: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  tileValue: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 32 },
  tileLabel: { color: c.textLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  allTime: { color: c.textLight, fontSize: 12, marginTop: 6, textAlign: 'center' },
  section: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  sectionTitle: { color: c.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1.2, marginBottom: 10 },
  seasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  seasonHead: { paddingVertical: 4 },
  headText: { color: c.textLight, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  seasonLabel: { flex: 1, color: c.text, fontSize: 14 },
  seasonNum: { width: 46, textAlign: 'center', color: c.text, fontSize: 14 },
  note: { color: c.textLight, fontSize: 14, lineHeight: 20 },
}));
