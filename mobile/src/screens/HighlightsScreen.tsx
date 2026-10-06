import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { themedStyles, useBrandColors } from '../theme/brand';
import { withOpacity } from '../theme/utils';
import MatchHighlightsList from '../components/highlights/MatchHighlightsList';
import GotmPanel from '../components/gotm/GotmPanel';
import ScreenIntro from '../components/brand/ScreenIntro';

type Tab = 'matches' | 'gotm';

/**
 * Highlights: clips from each match's video (Match Centre taps) and Goal of
 * the Month.
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
          <View style={styles.section}><MatchHighlightsList /></View>
        ) : (
          <GotmPanel />
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  subtitle: { fontSize: 14, color: c.textLight, marginHorizontal: 16, marginTop: 12 },
  tabs: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, maxWidth: 760, width: '100%', alignSelf: 'center' },
  content: { paddingBottom: 48 },
  section: { paddingHorizontal: 16, paddingTop: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
}));
