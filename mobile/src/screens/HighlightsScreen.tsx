import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { themedStyles, useBrandColors } from '../theme/brand';
import { withOpacity } from '../theme/utils';
import { videosApi } from '../services/api';
import MatchHighlightsList from '../components/highlights/MatchHighlightsList';
import GotmPanel from '../components/gotm/GotmPanel';
import ScreenIntro from '../components/brand/ScreenIntro';
import SectionTitle from '../components/home/SectionTitle';
import { clubVideoLine, readClubVideos, type ClubVideo } from '../utils/highlights';

type Tab = 'matches' | 'gotm';

/**
 * Highlights: clips from each match's video (Match Centre taps), videos staff
 * uploaded on the website, and Goal of the Month.
 */
export default function HighlightsScreen({ inTab = false }: { inTab?: boolean } = {}) {
  const c = useBrandColors();
  const styles = useStyles();
  const [tab, setTab] = useState<Tab>('matches');

  return (
    <View style={styles.container}>
      {inTab
        ? <ScreenIntro title="Highlights" subtitle="Match clips and Goal of the Month" />
        : <Text style={styles.subtitle}>Match clips and Goal of the Month</Text>}
      <View style={styles.tabs}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          buttons={[
            { value: 'matches', label: 'Matches', icon: 'play-box-multiple' },
            { value: 'gotm', label: 'Goal of the Month', icon: 'trophy' },
          ]}
          theme={{ colors: { secondaryContainer: withOpacity(c.primary, 0.2) } }}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'matches' ? (
          <>
            <View style={styles.section}><MatchHighlightsList /></View>
            <ClubVideos />
          </>
        ) : (
          <GotmPanel />
        )}
      </ScrollView>
    </View>
  );
}

/** Videos staff uploaded on the website. Shown only when there are some. */
function ClubVideos() {
  const c = useBrandColors();
  const styles = useStyles();
  const [videos, setVideos] = useState<ClubVideo[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await videosApi.list();
      setVideos(readClubVideos(res?.data));
    } catch {
      // Uploaded videos are an extra: the match clips above still show
      setVideos([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!videos.length) return null;

  const open = (v: ClubVideo) => {
    if (v.videoUrl) setPlaying((p) => (p === v.id ? null : v.id));
    else if (v.youtubeUrl) void Linking.openURL(v.youtubeUrl);
  };

  return (
    <View style={styles.section}>
      <SectionTitle title="CLUB VIDEOS" color={c.primary} />
      {videos.map((v) => (
        <View key={v.id} style={styles.videoCard}>
          {playing === v.id && v.videoUrl ? (
            <Video source={{ uri: v.videoUrl }} style={styles.video} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay />
          ) : null}
          <Pressable onPress={() => open(v)} style={styles.videoRow} accessibilityRole="button" accessibilityLabel={`Play ${v.title}`}>
            <MaterialCommunityIcons name={v.videoUrl ? (playing === v.id ? 'stop-circle' : 'play-circle') : 'youtube'} size={34} color={c.primary} />
            <View style={styles.flex}>
              <Text style={styles.videoTitle}>{v.title}</Text>
              <Text style={styles.videoLine}>{clubVideoLine(v)}</Text>
              {v.description ? <Text style={styles.videoDesc} numberOfLines={2}>{v.description}</Text> : null}
            </View>
          </Pressable>
          {playing === v.id && v.youtubeUrl ? (
            <Pressable onPress={() => Linking.openURL(v.youtubeUrl as string)} accessibilityRole="link" style={styles.youtube}>
              <MaterialCommunityIcons name="youtube" size={18} color={c.textLight} />
              <Text style={styles.youtubeText}>Watch on YouTube</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  subtitle: { fontSize: 14, color: c.textLight, marginHorizontal: 16, marginTop: 12 },
  tabs: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, maxWidth: 760, width: '100%', alignSelf: 'center' },
  content: { paddingBottom: 48 },
  section: { paddingHorizontal: 16, paddingTop: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  videoCard: { borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 10, overflow: 'hidden' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  videoTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
  videoLine: { color: c.textLight, fontSize: 12, marginTop: 2 },
  videoDesc: { color: c.text, fontSize: 13, marginTop: 4 },
  youtube: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  youtubeText: { color: c.textLight, fontWeight: '700', textDecorationLine: 'underline' },
}));
