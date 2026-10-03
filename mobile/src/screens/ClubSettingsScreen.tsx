import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import ClubBadgeCard from '../components/clubSettings/ClubBadgeCard';
import SocialAccountsCard from '../components/clubSettings/SocialAccountsCard';
import PostingCard from '../components/clubSettings/PostingCard';
import GraphicsCard from '../components/clubSettings/GraphicsCard';
import FaSnippetsCard from '../components/clubSettings/FaSnippetsCard';
import FixtureEmailCard from '../components/clubSettings/FixtureEmailCard';
import SettingsCard, { useCardStyles } from '../components/clubSettings/SettingsCard';
import { apiErrorMessage } from '../services/api';
import { clubSettingsApi, type SocialSettings } from '../services/clubSettingsApi';
import { useClub } from '../context/ClubContext';
import { WEBSITE_URL } from '../config';
import { themedStyles, useBrandColors } from '../theme/brand';

/**
 * Manager Zone → Club Settings: the club badge, Facebook and Instagram, what
 * gets posted where, graphics and sponsor, FA Full-Time snippets and FA email
 * forwarding. The same settings as the website's Admin → Settings.
 *
 * Settings reload when the screen comes back into view, so returning from
 * Facebook's login shows the connection (or the Pages to choose from).
 */
export default function ClubSettingsScreen() {
  const c = useBrandColors();
  const styles = useStyles();
  const card = useCardStyles();
  const { club } = useClub();
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const loading = useRef(false);

  const load = useCallback(async (pull = false) => {
    if (loading.current) return;
    loading.current = true;
    if (pull) setRefreshing(true);
    try {
      setSettings(await clubSettingsApi.social());
      setLoadError('');
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Club settings couldn't load. Check your connection and try again."));
    } finally {
      loading.current = false;
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  // Back from Facebook in the browser: the app becomes active again
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  const say = useCallback((text: string, error = false) => setMessage({ text, error }), []);

  if (!settings) {
    return (
      <View style={styles.center}>
        {loadError ? (
          <>
            <Text style={styles.errorText} accessibilityRole="alert">{loadError}</Text>
            <Button mode="contained" onPress={() => load()}>Try again</Button>
          </>
        ) : <ActivityIndicator color={c.primary} size="large" />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
      >
        <Text style={styles.intro}>
          Your badge, social media, what gets posted where, graphics, FA snippets and email forwarding. Changes here also show on the website.
        </Text>
        <ClubBadgeCard canManage={settings.canManage} onMessage={say} />
        <SocialAccountsCard settings={settings} onSaved={setSettings} onMessage={say} />
        <PostingCard settings={settings} onSaved={setSettings} onMessage={say} />
        <GraphicsCard settings={settings} onSaved={setSettings} onMessage={say} />
        <FaSnippetsCard canManage={settings.canManage} onMessage={say} />
        <FixtureEmailCard onMessage={say} />
        {club?.slug ? (
          <SettingsCard icon="web" title="More on the website" help="Live match video (YouTube) is set up on the website's settings for now.">
            <View style={card.buttons}>
              <Button mode="outlined" compact icon="open-in-new" onPress={() => Linking.openURL(`${WEBSITE_URL}/${club.slug}/admin/settings`)}>Website settings</Button>
            </View>
          </SettingsCard>
        ) : null}
      </ScrollView>
      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage(null)}
        duration={message?.error ? 6000 : 3000}
        style={message?.error ? styles.snackError : undefined}
        action={{ label: 'OK', onPress: () => setMessage(null) }}
      >
        {message?.text ?? ''}
      </Snackbar>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingTop: 12, paddingBottom: 48 },
  intro: { color: c.textLight, marginHorizontal: 16, marginBottom: 14, fontSize: 14, lineHeight: 20 },
  center: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: c.text, textAlign: 'center', fontSize: 15 },
  snackError: { backgroundColor: c.error },
}));
