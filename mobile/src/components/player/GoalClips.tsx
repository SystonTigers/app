import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ClipPlayer from '../highlights/ClipPlayer';
import { themedStyles, useBrandColors } from '../../theme/brand';
import { clipLabel, nextGoal, type GoalClip } from '../../utils/playerPage';

/** A player's goals from the match videos. One plays at a time; the next follows on. */
export default function GoalClips({ clips }: { clips: GoalClip[] }) {
  const c = useBrandColors();
  const styles = useStyles();
  const [playing, setPlaying] = useState(-1);
  const current = playing >= 0 ? clips[playing] : null;

  const play = (i: number) => {
    const clip = clips[i];
    if (!clip.embeddable) {
      void Linking.openURL(clip.watchUrl);
      return;
    }
    setPlaying(i);
  };

  return (
    <View>
      {current ? (
        <View style={styles.player}>
          <ClipPlayer videoId={current.videoId} clip={{ start: current.start, end: current.end }} onEnded={() => setPlaying((i) => nextGoal(clips, i))} />
          <Text style={styles.now}>{clipLabel(current).title}{current.detail ? ` · ${current.detail}` : ''}</Text>
        </View>
      ) : null}
      {clips.map((clip, i) => {
        const { title, when } = clipLabel(clip);
        return (
          <Pressable key={clip.id} onPress={() => play(i)} accessibilityRole="button" accessibilityLabel={`Play ${title}, ${when}`} style={[styles.row, i === playing ? styles.on : null]}>
            <MaterialCommunityIcons name={i === playing ? 'volume-high' : clip.embeddable ? 'play-circle' : 'youtube'} size={30} color={c.primary} />
            <View style={styles.text}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.when}>{when}{clip.detail ? ` · ${clip.detail}` : ''}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((c) => ({
  player: { marginBottom: 10 },
  now: { color: c.text, fontWeight: '700', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  on: { backgroundColor: c.primarySoft },
  text: { flex: 1 },
  title: { color: c.text, fontWeight: '700', fontSize: 15 },
  when: { color: c.textLight, fontSize: 12, marginTop: 2 },
}));
